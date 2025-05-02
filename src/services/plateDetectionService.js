const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const os = require('os');

class PlateDetectionService {
    constructor() {
        // Fix: Add the trailing hyphen to match the actual folder name
        this.pythonScriptPath = path.join(
            __dirname,         // Current directory (services)
            '../..',          // Go up to Backend root
            'Car-Number-Plates-Detection-IA-Model-',  // Note the trailing hyphen
            'tunisian_plate_detector.py'
        );
        
        // Define dependencies installation paths
        this.requirementsPath = path.join(
            __dirname, '../../Car-Number-Plates-Detection-IA-Model-/requirements_minimal.txt'
        );
        
        this.requiredDependencies = [
            'opencv-python>=4.5.0,<4.12.0',  // Specify older version that's more stable
            'easyocr>=1.6.0', 
            'numpy>=1.20.0', 
            'torch>=1.9.0'
        ];

        // Add dependency check flag to prevent repeated installation
        this.dependenciesChecked = false;
        
        console.log('Backend root:', path.join(__dirname, '../..'));
        console.log('Python script path:', this.pythonScriptPath);
        this.initialize();
    }

    async initialize() {
        console.log('🔍 Initializing PlateDetectionService');
        console.log('📂 Current directory:', __dirname);
        console.log('🐍 Python script path:', this.pythonScriptPath);
        
        try {
            await this.verifyScript();
            await this.installMinimalRequirements();
            console.log('✅ Plate detection service initialized successfully');
        } catch (error) {
            console.error('❌ Service initialization failed:', error);
        }
    }

    async verifyScript() {
        try {
            const exists = await fs.access(this.pythonScriptPath)
                .then(() => true)
                .catch(() => false);

            if (!exists) {
                console.error('❌ Script not found at:', this.pythonScriptPath);
                // Add more detailed debugging information
                const backendRoot = path.join(__dirname, '../..');
                const modelDir = path.join(backendRoot, 'Car-Number-Plates-Detection-IA-Model-');
                
                console.log('📁 Model directory:', modelDir);
                try {
                    const modelFiles = await fs.readdir(modelDir);
                    console.log('📑 Model directory contents:', modelFiles);
                } catch (err) {
                    console.error('❌ Cannot read model directory:', err.message);
                }
                
                throw new Error(`Python script not found at: ${this.pythonScriptPath}`);
            }

            console.log('✅ Found Python script at:', this.pythonScriptPath);
            await this.verifyPythonInstallation();

        } catch (error) {
            throw new Error(`Script verification failed: ${error.message}`);
        }
    }

    async verifyPythonInstallation() {
        return new Promise((resolve, reject) => {
            const python = spawn('python', ['--version']);
            let output = '';

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                output += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    console.log('🐍 Python version:', output.trim());
                    resolve();
                } else {
                    reject(new Error(`Python not found or not properly installed. Output: ${output}`));
                }
            });
        });
    }

    async createMinimalRequirements() {
        // Create a minimal requirements file for essential dependencies
        const content = this.requiredDependencies.map(dep => `${dep}`).join('\n');
        await fs.writeFile(this.requirementsPath, content);
        console.log('✍️ Created minimal requirements file');
    }

    async installMinimalRequirements() {
        try {
            // Skip if dependencies were already checked in this session
            if (this.dependenciesChecked) {
                console.log('✅ Dependencies already checked in this session, skipping installation');
                return;
            }
            
            // Create minimal requirements file if it doesn't exist
            await this.createMinimalRequirements();

            // Check if dependencies are already installed - improve comparison
            const installedPackages = await this.getInstalledPackages();
            console.log('📦 Checking installed Python packages...');
            
            const missingDeps = [];
            for (const dep of this.requiredDependencies) {
                const pkgName = dep.split('>=')[0].split('<')[0].trim();
                if (!installedPackages.some(pkg => pkg.toLowerCase() === pkgName.toLowerCase())) {
                    missingDeps.push(dep);
                }
            }

            // Mark as checked to prevent future reinstallation
            this.dependenciesChecked = true;

            if (missingDeps.length === 0) {
                console.log('✅ All required Python packages are installed');
                return;
            }

            console.log('⚠️ Missing Python packages:', missingDeps.join(', '));
            console.log('📦 Installing required packages...');

            return new Promise((resolve, reject) => {
                // For Windows compatibility, use windowsHide option
                const pip = spawn('pip', ['install', '-r', this.requirementsPath], { 
                    windowsHide: true 
                });
                
                pip.stdout.on('data', (data) => {
                    console.log('📦 Installation:', data.toString().trim());
                });

                pip.stderr.on('data', (data) => {
                    console.log('📦 Installation info:', data.toString().trim());
                });

                pip.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Dependencies installed successfully');
                        resolve();
                    } else {
                        console.error('❌ Failed to install dependencies');
                        // Don't reject - try to continue anyway
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Error installing requirements:', error);
            // Continue execution even if installation fails
        }
    }

    async getInstalledPackages() {
        return new Promise((resolve, reject) => {
            const pip = spawn('pip', ['list']);
            let output = '';

            pip.stdout.on('data', (data) => {
                output += data.toString();
            });

            pip.on('error', (err) => {
                console.error('Failed to run pip list:', err);
                resolve([]);  // Return empty array on error
            });

            pip.on('close', (code) => {
                if (code !== 0) {
                    console.warn(`pip list exited with code ${code}`);
                    resolve([]);
                    return;
                }

                // Improved parsing of pip list output
                try {
                    const lines = output.split('\n').slice(2); // Skip header lines
                    const packages = lines
                        .filter(Boolean)  // Remove empty lines
                        .map(line => {
                            const parts = line.trim().split(/\s+/);
                            return parts[0].toLowerCase();  // Get package name and normalize case
                        });
                    console.log(`🔍 Found ${packages.length} installed Python packages`);
                    resolve(packages);
                } catch (err) {
                    console.error('Error parsing pip output:', err);
                    resolve([]);
                }
            });
        });
    }

    async downloadImage(imageUrl) {
        const response = await axios({
            url: imageUrl,
            responseType: 'arraybuffer'
        });
        const tempPath = path.join(os.tmpdir(), `plate-${Date.now()}.jpg`);
        await fs.writeFile(tempPath, response.data);
        return tempPath;
    }

    standardizeTunisianPlate(plateText) {
        if (!plateText) return null;

        // Nettoyer le texte (enlever les espaces supplémentaires)
        const cleanText = plateText.trim().replace(/\s+/g, ' ');
        
        // Séparer les parties de la plaque
        const parts = cleanText.split(' ');
        
        if (parts.length === 3) {
            const [first, region, last] = parts;
            
            // Vérifier si le premier nombre est plus grand que le dernier
            // Si oui, inverser pour avoir le format "petit_nombre تونس grand_nombre"
            const num1 = parseInt(first);
            const num2 = parseInt(last);
            
            if (!isNaN(num1) && !isNaN(num2)) {
                if (num1 > num2) {
                    // Inverser les nombres
                    return `${last} ${region} ${first}`;
                }
            }
        }
        
        return plateText;
    }

    async detectPlate(imageUrl) {
        let tempFilePath = null;
        try {
            tempFilePath = await this.downloadImage(imageUrl);
            
            console.log('🔄 Processing image:', tempFilePath);
            console.log('📜 Using script:', this.pythonScriptPath);

            const result = await new Promise((resolve, reject) => {
                // Set a longer timeout for more intensive processing
                const timeout = setTimeout(() => {
                    console.error('⏰ Python process timed out after 60 seconds');
                    pythonProcess.kill();
                    reject(new Error('Detection timed out after 60 seconds'));
                }, 60000);  // Increased from 30000 to 60000
                
                // Add windowsHide option for Windows compatibility
                const pythonProcess = spawn('python', [
                    this.pythonScriptPath,
                    '--image', tempFilePath,
                    '--no-display'  // Prevent GUI windows in server environment
                ], { 
                    windowsHide: true 
                });

                let output = '';
                let error = '';

                pythonProcess.stdout.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    console.log('📤 Python output:', text);
                });

                pythonProcess.stderr.on('data', (data) => {
                    const text = data.toString();
                    error += text;
                    console.error('⚠️ Python error:', text);
                });

                pythonProcess.on('error', (err) => {
                    clearTimeout(timeout);
                    console.error('❌ Failed to start Python process:', err);
                    reject(new Error('Failed to start Python process: ' + err.message));
                });

                pythonProcess.on('close', async (code) => {
                    clearTimeout(timeout);
                    try {
                        await fs.unlink(tempFilePath);
                    } catch (err) {
                        console.error('Error cleaning up temp file:', err);
                    }

                    // Check for process failure but allow special "no plate" status
                    if (code !== 0) {
                        return reject(new Error(`Python process failed: ${error}`));
                    }

                    // Debug output
                    console.log('🔍 Full Python output:', output);
                    
                    // Check for the special "no plate detected" status
                    const noPlateDetected = output.includes("STATUS:NO_PLATE_DETECTED");
                    
                    const plateMatch = output.match(/Detected Text: ([^\n(]+)(?:\s*\(Confidence:|$)/);
                    const plateText = plateMatch ? plateMatch[1].trim() : null;
                    
                    // Extract confidence if available
                    const confidenceMatch = output.match(/Confidence: ([\d.]+)/);
                    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0;

                    // If no plate was detected, return a proper "no plate" result
                    if (noPlateDetected || !plateText) {
                        resolve({
                            success: false,
                            plateText: null,
                            rawPlateText: null,
                            confidence: 0,
                            fullOutput: output,
                            noPlateDetected: true
                        });
                        return;
                    }

                    // Standardiser le format de la plaque
                    const standardizedPlateText = this.standardizeTunisianPlate(plateText);
                    
                    console.log('Original plate text:', plateText);
                    console.log('Standardized plate text:', standardizedPlateText);

                    resolve({
                        success: Boolean(plateText),
                        plateText: standardizedPlateText,
                        rawPlateText: plateText,
                        confidence: confidence,
                        fullOutput: output
                    });
                });
            });

            return result;
        } catch (error) {
            console.error('❌ Plate detection failed:', error);
            throw error;
        } finally {
            // Make sure temp file gets deleted even if there was an error
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath).catch(() => {});
                } catch (err) {
                    // Ignore errors during cleanup
                }
            }
        }
    }

    async runDiagnostics() {
        return new Promise((resolve, reject) => {
            // Run a simple help command to check if script arguments are correct
            const pythonProcess = spawn('python', [
                this.pythonScriptPath,
                '--help'
            ], { 
                windowsHide: true 
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                resolve({
                    exitCode: code,
                    stdout,
                    stderr,
                    arguments: {
                        scriptPath: this.pythonScriptPath,
                        helpOutput: stdout || stderr
                    }
                });
            });

            pythonProcess.on('error', (err) => {
                reject(new Error(`Failed to run diagnostics: ${err.message}`));
            });
        });
    }
}

module.exports = new PlateDetectionService();
