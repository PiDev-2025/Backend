const express = require('express');
const router = express.Router();
const { sendResetPasswordEmail, resetPassword } = require('../controllers/passwordController');

// Route to handle forget password
router.post('/forget-password', sendResetPasswordEmail);

// Route to handle reset password
router.post('/reset-password/:token', resetPassword);

module.exports = router;
