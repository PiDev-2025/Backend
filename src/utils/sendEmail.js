const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    secure: true,
    auth: {
      user: 'artyvenci@gmail.com', 
      pass: 'nbov fksh cnbw bckh', 
    },
  }); 
  const mailOptions = {
    from: 'artyvenci@gmail.com',
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
