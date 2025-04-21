const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure the email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER ,
    pass: process.env.EMAIL_PASS 
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
