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

router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        // Use the Cloudinary URL
        const result = await plateDetectionService.detectPlate(req.file.path);

        res.json({
            success: true,
            plateText: result.plateText,
            details: result.fullOutput,
            imageUrl: req.file.path // Cloudinary URL
        });

    } catch (error) {
        console.error('Error in plate detection:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing image',
            error: error.message
        });
    }
});

module.exports = router;
