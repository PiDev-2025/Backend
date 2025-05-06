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

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 5MB limit
    }
});

// Health check endpoint to verify Flask API is running
router.get('/health', async (req, res) => {
    try {
        const diagnostics = await plateDetectionService.runDiagnostics();
        return res.json({
            status: 'ok',
            message: 'Plate detection service is available',
            flaskApi: diagnostics
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Plate detection service error',
            error: error.message
        });
    }
});

// Endpoint that handles both direct image URLs and file uploads
router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        let imageUrl;

        // Check if we have a file upload
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
        } 
        // Check if an image URL was provided in the request body
        else if (req.body && req.body.imageUrl) {
            imageUrl = req.body.imageUrl;
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'No image provided. Upload a file or provide an imageUrl in the request body.' 
            });
        }

        console.log(`Processing plate detection for image: ${imageUrl}`);
        const result = await plateDetectionService.detectPlate(imageUrl);
        
        return res.json({
            success: result.success,
            plateText: result.plateText,
            confidence: result.confidence || 0,
            noPlateDetected: result.noPlateDetected || false,
            imageUrl: imageUrl,
            details: result.fullOutput || null
        });
    } catch (error) {
        console.error('Plate detection API error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to process plate detection',
            message: error.message
        });
    }
});

// Alternative endpoint for direct URL without file upload
router.post('/detect-url', async (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Image URL is required' 
            });
        }

        console.log(`Processing plate detection for image URL: ${imageUrl}`);
        const result = await plateDetectionService.detectPlate(imageUrl);
        
        return res.json({
            success: result.success,
            plateText: result.plateText,
            confidence: result.confidence || 0,
            noPlateDetected: result.noPlateDetected || false,
            imageUrl: imageUrl,
            details: result.fullOutput || null
        });
    } catch (error) {
        console.error('Plate detection API error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to process plate detection',
            message: error.message
        });
    }
});

module.exports = router;
