const crypto = require('crypto');
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
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};
