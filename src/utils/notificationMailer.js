const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true, // Enforce SSL/TLS for secure connection
    auth: {
        user: "artyvenci@gmail.com",
        pass: "nbov fksh cnbw bckh",
    },
});

const sendClaimStatusEmail = async ({ email, status, userName, claimId, parkingName, message, reservationDetails }) => {
    const statusInfo = {
        pending: {
            color: '#EAB308',
            icon: '⏳',
            title: 'Réclamation en cours de traitement',
            message: 'Votre réclamation est en cours d\'examen.'
        },
        resolved: {
            color: '#22C55E',
            icon: '✅',
            title: 'Réclamation résolue',
            message: 'Votre réclamation a été traitée avec succès.'
        },
        rejected: {
            color: '#EF4444',
            icon: '❌',
            title: 'Réclamation rejetée',
            message: 'Votre réclamation n\'a pas pu être validée.'
        }
    }[status] || {
        color: '#6B7280',
        icon: 'ℹ️',
        title: 'Mise à jour de votre réclamation',
        message: 'Le statut de votre réclamation a été mis à jour.'
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background-color: ${statusInfo.color}; color: white; padding: 2rem; text-align: center; }
                .content { padding: 2rem; background: #f8fafc; }
                .footer { text-align: center; padding: 1rem; background: #f1f5f9; color: #64748b; }
                .status-badge { 
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    background-color: ${statusInfo.color};
                    color: white;
                    font-weight: bold;
                }
                .message-box {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                }
                .reservation-details {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                }
                .user-info {
                    font-weight: bold;
                    color: #0369a1;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${statusInfo.icon} ${statusInfo.title}</h1>
                </div>
                <div class="content">
                    <p>Bonjour ${userName || 'Cher client'},</p>
                    <p>${statusInfo.message}</p>
                    
                    <div class="message-box">
                        <h3>Détails de la réclamation :</h3>
                        <p><strong>Référence :</strong> ${claimId}</p>
                        <p><strong>Parking concerné :</strong> ${parkingName}</p>
                        <p><strong>Statut actuel :</strong> 
                            <span class="status-badge">${status}</span>
                        </p>
                        
                        ${reservationDetails ? `
                        <div class="reservation-details">
                            <h4>Détails de la réservation associée :</h4>
                            <p><strong>Propriétaire du véhicule :</strong> <span class="user-info">${reservationDetails.userName}</span></p>
                            <p><strong>Plaque d'immatriculation :</strong> ${reservationDetails.plateNumber}</p>
                            <p><strong>Date de début :</strong> ${new Date(reservationDetails.startTime).toLocaleDateString('fr-FR', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</p>
                            <p><strong>Date de fin :</strong> ${new Date(reservationDetails.endTime).toLocaleDateString('fr-FR', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</p>
                        </div>
                        ` : ''}
                        
                        ${message ? `
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                            <strong>Message du gestionnaire :</strong>
                            <p style="font-style: italic;">${message}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                </div>
                <div class="footer">
                    <p>© 2025 Parkini. Tous droits réservés.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    await transporter.sendMail({
        from: "artyvenci@gmail.com",
        to: email,
        subject: statusInfo.title,
        html: htmlContent
    });
};

module.exports = { sendClaimStatusEmail };
