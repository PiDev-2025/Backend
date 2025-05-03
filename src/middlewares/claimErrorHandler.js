const claimErrorHandler = (err, req, res, next) => {
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            error: 'Image upload error',
            details: err.message
        });
    }

    if (err.message === 'No plate detected') {
        return res.status(422).json({
            success: false,
            error: 'No license plate detected',
            details: 'Please upload a clear image of the vehicle with visible license plate'
        });
    }

    if (err.message === 'No matching reservation') {
        return res.status(404).json({
            success: false,
            error: 'No matching reservation found',
            details: 'The detected license plate is not associated with any active reservation'
        });
    }

    // For Python script errors
    if (err.message && err.message.includes('Python process failed')) {
        return res.status(500).json({
            success: false,
            error: 'Plate detection failed',
            details: 'Error processing the image. Please try again with a different image.'
        });
    }

    // Default error handler
    console.error('Claim Error:', err);
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
};

module.exports = claimErrorHandler;