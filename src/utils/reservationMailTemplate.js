const getReservationConfirmationTemplate = (userName, parkingName, qrCode, startTime, endTime, spotId) => {
  const formattedStartTime = new Date(startTime).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const formattedEndTime = new Date(endTime).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4338CA; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .info-box { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4338CA; }
        .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
        .detail-item { display: flex; align-items: center; margin: 10px 0; }
        .icon { margin-right: 10px; font-size: 18px; color: #4338CA; }
        .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        .button { background: #4338CA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎉 Réservation Confirmée!</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${userName},</h2>
          <p>Nous sommes ravis de vous confirmer que votre réservation au parking <strong>${parkingName}</strong> a été acceptée.</p>
          
          <div class="info-box">
            <h3 style="color: #4338CA; margin-top: 0;">📝 Détails de votre réservation</h3>
            <div class="detail-item">
              <span class="icon">🅿️</span>
              <span>Place de parking: <strong>${spotId}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕒</span>
              <span>Début: <strong>${formattedStartTime}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕕</span>
              <span>Fin: <strong>${formattedEndTime}</strong></span>
            </div>
          </div>

          <div class="qr-section">
            <h3 style="color: #4338CA;">Votre QR Code d'accès</h3>
            <img src="cid:qrcode" alt="QR Code" style="max-width: 250px; width: 100%; margin: 20px auto; display: block;"/>
            <p style="color: #64748b; text-align: center;">Présentez ce QR code à votre arrivée pour accéder à votre place</p>
          </div>

          <div class="divider"></div>

          <div style="text-align: center;">
            <p><strong>🚗 Instructions importantes:</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li>✓ Arrivez quelques minutes avant l'heure de début</li>
              <li>✓ Gardez votre QR code à portée de main</li>
              <li>✓ Respectez l'emplacement assigné</li>
            </ul>
          </div>

          <div class="footer">
            <p>Merci de votre confiance!</p>
            <p style="color: #94a3b8;">Pour toute question, n'hésitez pas à nous contacter</p>
            <p style="color: #94a3b8;">L'équipe Parkini 🚀</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { getReservationConfirmationTemplate };
