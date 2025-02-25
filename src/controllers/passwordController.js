const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const sendEmail = require('../utils/sendEmail');

exports.sendResetPasswordEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Force the frontend URL without using any variables
    const resetUrl = 'http://localhost:3000/reset-password/' + token;
    
    const message = `
Hello,

You requested a password reset for your account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
Your App Team`;

    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message,
    });

    res.status(200).json({ 
      message: 'Password reset email sent successfully',
      success: true,
      resetUrl // Include the URL in the response for debugging
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      message: 'Error sending password reset email',
      success: false 
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  
  try {
    // Enhanced validation
    if (!token) {
      return res.status(400).json({
        message: 'Reset token is missing',
        success: false
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: 'Password is required and must be at least 6 characters long',
        success: false
      });
    }

    // Find user and ensure token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      // Log detailed information for debugging
      console.log('Reset attempt failed:', {
        providedToken: token,
        currentTime: new Date(),
        tokenExists: Boolean(token)
      });
      
      return res.status(400).json({
        message: 'Invalid or expired password reset token',
        success: false
      });
    }

    // Log successful user find
    console.log('User found:', {
      userId: user._id,
      tokenExpiry: user.resetPasswordExpires,
      currentTime: new Date()
    });

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      message: 'Password reset successful',
      success: true
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Internal server error during password reset',
      success: false,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
