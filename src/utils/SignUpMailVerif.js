
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // Create a transporter for Gmail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "Marwaniwael88@gmail.com", // Your email address
      pass: "vhgt kjkc gkbi rbkr", // Your password or app password
    },
  });

  // Define the email content with HTML
  const mailOptions = {
    from: "Marwaniwael88@gmail.com", // Sender address
    to: options.email, // Recipient address
    subject: options.subject || "Welcome to Parkini", // Email subject
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Welcome to Parkini</title>
  <style>
    /* Base styles with improved typography */
    body {
      font-family: 'Arial', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    /* Header section */
    .header {
      background-color: #000000;
      padding: 28px 0;
      text-align: center;
    }
    
    .logo {
      width: 140px;
      height: auto;
      margin-bottom: 12px;
    }
    
    .header h1 {
      color: white;
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    /* Content section */
    .content {
      padding: 35px;
      background-color: #ffffff;
    }
    
    .greeting {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 18px;
      color: #222222;
    }
    
    .message {
      font-size: 16px;
      margin-bottom: 25px;
      color: #444444;
      line-height: 1.7;
    }
    
    /* OTP section */
    .otp-container {
      background-color: #f9f9f9;
      border-radius: 6px;
      padding: 25px;
      text-align: center;
      margin: 25px 0;
      border: 1px solid #e0e0e0;
    }
    
    .otp-label {
      font-size: 15px;
      color: #555555;
      margin-bottom: 12px;
    }
    
    .otp {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #000000;
      padding: 10px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      display: inline-block;
    }
    
    .expiry {
      font-size: 14px;
      color: #777777;
      margin-top: 12px;
    }
    
    /* Feature list styling */
    ul {
      padding-left: 22px;
      margin: 20px 0;
    }
    
    li {
      margin-bottom: 12px;
      color: #333333;
      font-weight: 600;
    }
    
    /* CTA Button */
    .button-container {
      text-align: center;
      margin: 35px 0;
    }
    
    .button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 16px;
    }
    
    /* Footer section */
    .footer {
      background-color: #f7f7f7;
      padding: 25px 30px;
      text-align: center;
      font-size: 14px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
    }
    
    .social-links {
      margin: 18px 0;
    }
    
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #000000;
      text-decoration: none;
      font-weight: 500;
    }
    
    .help-text {
      margin-top: 18px;
      font-size: 13px;
      color: #777777;
    }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      
      .otp {
        font-size: 30px;
        letter-spacing: 4px;
      }
      
      .button {
        padding: 12px 25px;
        width: 80%;
      }
    }
  </style>
</head>

<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <img src="cid:logo" alt="Parkini Logo" class="logo" />
      <h1>Welcome to Parkini</h1>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">Hello, ${options.name || "Valued Customer"}</p>
      
      <p class="message">Thank you for choosing Parkini, your premium solution for smart and convenient parking. We're delighted to welcome you to our community of drivers who value efficiency and simplicity.</p>
      
      <!-- OTP Section -->
      <div class="otp-container">
        <p class="otp-label">Your secure verification code:</p>
        <div class="otp">${options.otp}</div>
        <p class="expiry">This code will expire in 10 minutes for your security</p>
      </div>
      
      <p class="message">With your Parkini account, you can enjoy these premium features:</p>
      <ul>
        <li>Access real-time parking availability across the city</li>
        <li>Reserve parking spots in advance to save time</li>
        <li>Make secure, contactless payments through our platform</li>
        <li>Navigate directly to your reserved parking location</li>
      </ul>
      
      <!-- CTA Button -->
      <div class="button-container">
        <a href="${
          options.appLink || "#"
        }" class="button" style="color: #ffffff;">Access Your Account</a>
      </div>
      
      <p class="message">Our dedicated support team is available 24/7 to assist you with any questions or concerns you may have about our services.</p>
      
      <p class="message">Thank you for choosing Parkini!<br><br>Warm regards,<br>The Parkini Team</p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="social-links">
        <a href="#" class="social-link">Facebook</a> |
        <a href="#" class="social-link">Twitter</a> |
        <a href="#" class="social-link">Instagram</a>
      </div>
      
      <p>© 2025 Parkini Inc. All rights reserved.</p>
      
      <p class="help-text">If you did not create an account with Parkini, please disregard this email and contact our support team.</p>
    </div>
  </div>
</body>
</html>
        `,
    attachments: [
      {
        filename: "logo.png",
        //path: "./resources/ParkiniWhite.png", // Replace with the path to your logo
        cid: "logo", // Cid to display the image directly in the HTML
      },
    ],
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};

module.exports = sendEmail;

