const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'Marwaniwael88@gmail.com', 
      pass: 'vhgt kjkc gkbi rbkr', 
    },
  }); 

  const mailOptions = {
    from: 'Marwaniwael88@gmail.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email');
  }
};

module.exports = sendEmail;