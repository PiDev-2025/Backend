const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const helmet = require('helmet');

// Appliquer les protections contre le fingerprinting
router.use(helmet.hidePoweredBy());

// Configure the email transporter with secure connection
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL/TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  }
});

/**
 * @route POST /api/notify/build-status
 * @desc Send build status notification email
 * @access Private
 */
router.post('/build-status', async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'jenkins@parkini.app',
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${to}`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Notification email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send notification email', 
      error: error.message 
    });
  }
});

module.exports = router;
