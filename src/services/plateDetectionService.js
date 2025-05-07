const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Flask API settings with environment variable support for Docker/hosting
const FLASK_URL = process.env.PLATE_DETECTOR_API_URL || 'https://parkini-plate-detector.onrender.com/detect_plate';
const FALLBACK_MODE_ENABLED = process.env.PLATE_DETECTOR_FALLBACK_ENABLED !== 'false';

class PlateDetectionService {
    constructor() {
        console.log('🌐 Plate Detection Service initializing');
        console.log(`🌐 Using Flask API URL: ${FLASK_URL}`);
        this.apiIsDown = false;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 60000; // 1 minute
    }

    async initialize() {
        console.log('🔍 Initializing PlateDetectionService');
        try {
            await this.checkApiAvailability();
            console.log('✅ Plate detection service initialized successfully');
        } catch (error) {
            console.error('⚠️ Flask API not reachable:', error.message);
            console.log('ℹ️ Will retry when processing requests');
            this.apiIsDown = true;
        }
    }

    async checkApiAvailability() {
        try {
            // Avoid too frequent health checks
            const now = Date.now();
            if (now - this.lastHealthCheck < this.healthCheckInterval) {
                return !this.apiIsDown;
            }
            
            this.lastHealthCheck = now;
            
            // Try both the root endpoint (lighter) and options request
            const response = await axios({
                method: 'get',
                url: FLASK_URL.replace('/detect_plate', '/'),
                timeout: 5000
            });
            
            // If we get here, API is up
            this.apiIsDown = false;
            return true;
        } catch (error) {
            console.warn(`⚠️ Flask API health check failed: ${error.message}`);
            this.apiIsDown = true;
            return false;
        }
    }

    async downloadImage(imageUrl) {
        try {
            const response = await axios({
                url: imageUrl,
                responseType: 'arraybuffer',
                timeout: 10000 // 10 second timeout for image download
            });
            return Buffer.from(response.data).toString('base64');
        } catch (error) {
            console.error('❌ Image download failed:', error.message);
            throw new Error(`Failed to download image: ${error.message}`);
        }
    }

    standardizeTunisianPlate(plateText) {
        if (!plateText) return null;

        console.log("Standardizing plate text:", plateText);

        // Clean and split the text (be careful with Arabic text)
        const cleanText = plateText.trim().replace(/\s+/g, ' ');
        const parts = cleanText.split(' ');
        
        console.log("Plate parts:", parts);
        
        // Check if تونس is present in the text
        const tunisiaTextPresent = parts.some(part => part === 'تونس');
        
        // If تونس is not present but we have numbers, add it
        if (!tunisiaTextPresent && parts.some(part => /^\d+$/.test(part))) {
            console.log("Tunisia text not found. Adding it to the plate format.");
            
            // If we have just numbers, add تونس in the middle
            if (parts.length >= 2 && parts.every(part => /^\d+$/.test(part))) {
                const sortedNumbers = [...parts].sort((a, b) => parseInt(a) - parseInt(b));
                return `${sortedNumbers[0]} تونس ${sortedNumbers[sortedNumbers.length-1]}`;
            }
            // If we have only one number, put تونس after it
            else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
                return `${parts[0]} تونس`;
            }
        }
        
        // Standard Tunisian plate format is: [num1] تونس [num2]
        // First, identify if we have the تونس text in the middle
        let tunisiaTextIndex = -1;
        for (let i = 0; i < parts.length; i++) {
            if (parts[i] === 'تونس') {
                tunisiaTextIndex = i;
                break;
            }
        }
        
        // If we found تونس and we have numbers on both sides
        if (tunisiaTextIndex > 0 && tunisiaTextIndex < parts.length - 1) {
            // Format is already correct with تونس in the middle
            const leftNumber = parts[tunisiaTextIndex - 1];
            const rightNumber = parts[tunisiaTextIndex + 1];
            
            // Parse numbers to check if they need to be reordered
            const leftValue = parseInt(leftNumber);
            const rightValue = parseInt(rightNumber);
            
            // Standard format: smaller_number تونس larger_number
            if (!isNaN(leftValue) && !isNaN(rightValue)) {
                if (leftValue > rightValue) {
                    // Swap numbers to follow standard format
                    const result = `${rightNumber} تونس ${leftNumber}`;
                    console.log(`Swapping numbers: ${cleanText} -> ${result}`);
                    return result;
                }
            }
        }
        
        // If we have تونس but it's not in the expected position, rearrange
        if (tunisiaTextIndex !== -1) {
            const numbers = parts.filter(part => /^\d+$/.test(part));
            if (numbers.length >= 2) {
                // Sort numbers by value
                const sortedNumbers = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
                const result = `${sortedNumbers[0]} تونس ${sortedNumbers[sortedNumbers.length-1]}`;
                console.log(`Rearranging: ${cleanText} -> ${result}`);
                return result;
            } else if (numbers.length === 1) {
                // Place the single number before تونس
                const result = `${numbers[0]} تونس`;
                console.log(`Single number format: ${cleanText} -> ${result}`);
                return result;
            }
        }
        
        // If no proper format is found, but we have numbers, create a standard format
        if (!tunisiaTextPresent) {
            const numbers = parts.filter(part => /^\d+$/.test(part));
            if (numbers.length >= 2) {
                const sortedNumbers = [...numbers].sort((a, b) => parseInt(a) - parseInt(b));
                return `${sortedNumbers[0]} تونس ${sortedNumbers[sortedNumbers.length-1]}`;
            } else if (numbers.length === 1) {
                return `${numbers[0]} تونس`;
            }
        }
        
        // If we couldn't standardize, return original
        return plateText;
    }

    async detectPlate(imageUrl) {
        let retries = 0;
        const maxRetries = 2;
        
        // Check API availability first to avoid unnecessary retries
        const isApiUp = await this.checkApiAvailability();
        if (!isApiUp && FALLBACK_MODE_ENABLED) {
            console.log('⚠️ API is down, using fallback detection mode');
            // Return a simplified response that lets the client know this is a fallback
            return {
                success: true,
                plateText: "100 تونس 7832", // Use same fallback plate as Python service
                rawPlateText: null,
                confidence: 0.1,
                fallbackMode: true,
                apiAvailable: false
            };
        }
        
        while (retries <= maxRetries) {
            try {
                console.log('🔄 Processing image from URL:', imageUrl);
                
                // Get base64 image data
                const base64Image = await this.downloadImage(imageUrl);
                
                // Call Flask API with timeout
                console.log('🌐 Sending request to Flask API...');
                const response = await axios.post(FLASK_URL, {
                    image: base64Image
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json' 
                    },
                    timeout: 45000  // Increased timeout to 45 seconds
                });

                const result = response.data;
                console.log('📊 API Response:', result);
                
                if (!result.success || result.noPlateDetected) {
                    return {
                        success: false,
                        plateText: null,
                        rawPlateText: null,
                        confidence: 0,
                        noPlateDetected: true
                    };
                }

                // Standardize plate format - make sure تونس is preserved
                const plateText = result.plateText || "";
                console.log(`Raw plate text from API: "${plateText}"`);
                
                // Ensure تونس is in the text if missing
                const containsTunisia = plateText.includes("تونس");
                let fixedPlateText = plateText;
                
                if (!containsTunisia && /\d+/.test(plateText)) {
                    // If we have numbers but no تونس, add it
                    const numbers = plateText.match(/\d+/g) || [];
                    if (numbers.length >= 1) {
                        fixedPlateText = `${numbers[0]} تونس`;
                        if (numbers.length >= 2) {
                            fixedPlateText += ` ${numbers[1]}`;
                        }
                        console.log(`Added missing تونس to text: ${fixedPlateText}`);
                    }
                }
                
                const standardizedPlateText = this.standardizeTunisianPlate(fixedPlateText);
                
                console.log('Original plate text:', plateText);
                console.log('Fixed plate text:', fixedPlateText);
                console.log('Standardized plate text:', standardizedPlateText);

                return {
                    success: true,
                    plateText: standardizedPlateText,
                    rawPlateText: plateText,
                    confidence: result.confidence,
                    fullOutput: JSON.stringify(result)
                };

            } catch (error) {
                retries++;
                console.error(`❌ Plate detection failed (attempt ${retries}/${maxRetries+1}):`, error.message);
                
                // If 5xx errors, mark API as potentially down
                if (error.response && error.response.status >= 500) {
                    this.apiIsDown = true;
                }
                
                // Wait before retry with exponential backoff
                if (retries <= maxRetries) {
                    const waitTime = 2000 * Math.pow(2, retries-1); // 2s, 4s, 8s...
                    console.log(`⏱️ Waiting ${waitTime}ms before retry ${retries}...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else if (FALLBACK_MODE_ENABLED) {
                    console.log('⚠️ All retries failed, using fallback mode');
                    // After all retries failed, return a fallback that clients can handle
                    return {
                        success: true,
                        plateText: "100 تونس 7832", // Use same fallback plate as Python service
                        rawPlateText: null, 
                        confidence: 0.1,
                        fallbackMode: true,
                        error: error.message
                    };
                } else {
                    throw new Error(`Failed to detect license plate after ${maxRetries+1} attempts: ${error.message}`);
                }
            }
        }
    }

    async runDiagnostics() {
        try {
            // Check if Flask API is accessible
            const response = await axios.get(FLASK_URL.replace('/detect_plate', '/'), {
                timeout: 5000
            }).catch(() => null);

            return {
                status: response ? 'available' : 'unavailable',
                apiUrl: FLASK_URL,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                apiUrl: FLASK_URL,
                lastChecked: new Date().toISOString()
            };
        }
    }
}

module.exports = new PlateDetectionService();
