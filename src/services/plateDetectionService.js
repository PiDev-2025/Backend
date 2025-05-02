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
            await this.verifyPythonDependencies();
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

    async verifyPythonDependencies() {
        return new Promise((resolve, reject) => {
            const pip = spawn('pip', ['list']);
            let output = '';

            pip.stdout.on('data', (data) => {
                output += data.toString();
            });

            pip.on('close', (code) => {
                const required = ['easyocr', 'opencv-python', 'numpy'];
                const missing = required.filter(pkg => !output.includes(pkg));

                if (missing.length > 0) {
                    console.warn('⚠️ Missing Python packages:', missing.join(', '));
                    console.warn('Installing required packages...');
                    this.installDependencies(missing);
                }
                resolve();
            });
        });
    }

    async installDependencies(packages) {
        return new Promise((resolve, reject) => {
            const pip = spawn('pip', ['install', ...packages]);
            
            pip.stdout.on('data', (data) => {
                console.log('📦 Installation:', data.toString());
            });

            pip.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Dependencies installed successfully');
                    resolve();
                } else {
                    console.error('❌ Failed to install dependencies');
                    reject();
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
                const pythonProcess = spawn('python', [
                    this.pythonScriptPath,
                    '-i', tempFilePath
                ]);

                let output = '';
                let error = '';

                pythonProcess.stdout.on('data', (data) => {
                    output += data.toString();
                    console.log('📤 Python output:', data.toString());
                });

                pythonProcess.stderr.on('data', (data) => {
                    error += data.toString();
                    console.error('⚠️ Python error:', data.toString());
                });

                pythonProcess.on('close', async (code) => {
                    try {
                        await fs.unlink(tempFilePath);
                    } catch (err) {
                        console.error('Error cleaning up temp file:', err);
                    }

                    if (code !== 0) {
                        return reject(new Error(`Python process failed: ${error}`));
                    }

                    const plateMatch = output.match(/Detected Text: ([^\n]+)/);
                    const plateText = plateMatch ? plateMatch[1].trim() : null;

                    // Standardiser le format de la plaque
                    const standardizedPlateText = this.standardizeTunisianPlate(plateText);
                    
                    console.log('Original plate text:', plateText);
                    console.log('Standardized plate text:', standardizedPlateText);

                    resolve({
                        success: true,
                        plateText: standardizedPlateText,
                        rawPlateText: plateText,
                        fullOutput: output
                    });
                });
            });

            return result;
        } catch (error) {
            console.error('❌ Plate detection failed:', error);
            throw error;
        }
    }
}

module.exports = new PlateDetectionService();
