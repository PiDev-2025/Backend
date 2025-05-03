const express = require('express');
const router = express.Router();
const plateDetectionService = require('../services/plateDetectionService');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Use existing Cloudinary configuration from server.js
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'plates',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => `plate-${Date.now()}`,
    },
});

const upload = multer({ storage });

// Health check endpoint to verify service is operational
router.get('/health', async (req, res) => {
    try {
        const health = await plateDetectionService.verifyPythonInstallation();
        // Try to run a simple test of the Python script
        const diagnostics = await plateDetectionService.runDiagnostics();
        res.json({
            status: 'ok',
            message: 'Plate detection service is operational',
            diagnostics
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            message: 'Plate detection service is not operational',
            error: error.message
        });
    }
});

router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        // Use the Cloudinary URL
        const result = await plateDetectionService.detectPlate(req.file.path);

        // Handle the case where no plate was detected
        if (result.noPlateDetected) {
            return res.json({
                success: false,
                plateText: null,
                message: 'No license plate detected in the image',
                imageUrl: req.file.path
            });
        }

        res.json({
            success: result.success,
            plateText: result.plateText,
            confidence: result.confidence || 0,
            details: result.fullOutput,
            imageUrl: req.file.path // Cloudinary URL
        });

    } catch (error) {
        console.error('❌ Plate detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing image',
            error: error.message
        });
    }
});

module.exports = router;
