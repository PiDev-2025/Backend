const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Créer un transporteur pour Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // Utilisation de Gmail pour envoyer l'email
        auth: {
            user: 'Marwaniwael88@gmail.com', // Ton adresse email
            pass: 'vhgt kjkc gkbi rbkr',  // Ton mot de passe ou mot de passe d'application
        },
    });

    // Définir le contenu de l'email avec du HTML
    const mailOptions = {
        from: 'Marwaniwael88@gmail.com',  // Adresse de l'expéditeur
        to: options.email,  // Adresse du destinataire
        subject: options.subject,  // Sujet de l'email
        html: `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { text-align: center; }
          .logo { width: 150px; }
          .otp { font-size: 24px; font-weight: bold; color: #2d87f0; }
          .message { margin-top: 20px; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="cid:logo" alt="Parkini Logo" class="logo" />
          <h1>Welcome to Parkini!</h1>
        </div>
        <p class="message">
          <p>Thank you for registering with Parkini.</p>
           <p>Your verification code is: <span class="otp">${options.otp}</span></p>
        </p>
        <p class="message">This code will expire in 10 minutes.</p>
      </body>
      </html>
    `,  // Contenu HTML de l'email, incluant un message personnalisé
        attachments: [
            {
                filename: 'logo.png',  // Nom du fichier du logo
                path: 'C:/Users/bensl/Desktop/PI/Backend/src/utils/ParkiniBlack.png',  // Remplacer avec le chemin vers ton logo
                cid: 'logo',  // Cid pour afficher l'image directement dans le HTML
            },
        ],
    };

    try {
        // Envoi de l'email
        await transporter.sendMail(mailOptions);
        console.log('Email envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email :', error);
        throw new Error('Erreur lors de l\'envoi de l\'email');
    }
};

module.exports = sendEmail;
