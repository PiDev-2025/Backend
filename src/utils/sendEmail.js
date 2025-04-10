const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  console.log('Attempting to send email to:', options.email);
  
  // Configure transporter with proper error handling
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER || 'Marwaniwael88@gmail.com', 
        pass: process.env.EMAIL_PASS || 'vhgt kjkc gkbi rbkr',
      },
      tls: {
        rejectUnauthorized: false // For testing/development
      }
    });
  } catch (error) {
    console.error('Error creating transporter:', error);
    return Promise.reject(new Error('Could not configure email transporter'));
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Marwaniwael88@gmail.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    console.log('Mail options:', JSON.stringify({
      to: mailOptions.to,
      subject: mailOptions.subject,
      textLength: mailOptions.text?.length || 0
    }));
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    return Promise.reject(new Error('Error sending email: ' + error.message));
  }
};

module.exports = sendEmail;