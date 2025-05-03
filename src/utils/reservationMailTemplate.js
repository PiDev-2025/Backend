const getReservationConfirmationTemplate = (userName, parkingName, qrCode, startTime, endTime, spotId) => {
  // Keep the date formatting in French for database consistency
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
          <h1 style="margin:0;">🎉 Reservation Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>We are pleased to confirm your reservation at <strong>${parkingName}</strong> parking has been accepted.</p>
          
          <div class="info-box">
            <h3 style="color: #4338CA; margin-top: 0;">📝 Reservation Details</h3>
            <div class="detail-item">
              <span class="icon">🅿️</span>
              <span>Parking spot: <strong>${spotId}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕒</span>
              <span>Start: <strong>${formattedStartTime}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕕</span>
              <span>End: <strong>${formattedEndTime}</strong></span>
            </div>
          </div>

          <div class="qr-section">
            <h3 style="color: #4338CA;">Your Access QR Code</h3>
            <img src="cid:qrcode" alt="QR Code" style="max-width: 250px; width: 100%; margin: 20px auto; display: block;"/>
            <p style="color: #64748b; text-align: center;">Present this QR code upon arrival to access your spot</p>
          </div>

          <div class="divider"></div>

          <div style="text-align: center;">
            <p><strong>🚗 Important Instructions:</strong></p>
            <ul style="list-style: none; padding: 0;">
              <li>✓ Arrive a few minutes before start time</li>
              <li>✓ Keep your QR code handy</li>
              <li>✓ Use only your assigned spot</li>
            </ul>
          </div>

          <div class="footer">
            <p>Thank you for your trust!</p>
            <p style="color: #94a3b8;">If you have any questions, don't hesitate to contact us</p>
            <p style="color: #94a3b8;">The Parkini Team 🚀</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getReservationRejectionTemplate = (userName, parkingName, startTime, endTime, spotId, reason) => {
  // Keep the date formatting in French for database consistency
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
        .header { background: #DC2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .info-box { background: #FEE2E2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #DC2626; }
        .detail-item { display: flex; align-items: center; margin: 10px 0; }
        .icon { margin-right: 10px; font-size: 18px; color: #DC2626; }
        .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        .reason-box { 
          background: #FFEAEA;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .reason-item {
          margin-bottom: 15px;
          padding-left: 20px;
          position: relative;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">❌ Reservation Not Confirmed</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName},</h2>
          <p>We regret to inform you that your reservation request at <strong>${parkingName}</strong> parking could not be confirmed.</p>
          
          <div class="info-box">
            <h3 style="color: #DC2626; margin-top: 0;">📝 Reservation Details</h3>
            <div class="detail-item">
              <span class="icon">🅿️</span>
              <span>Parking spot: <strong>${spotId}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕒</span>
              <span>Start: <strong>${formattedStartTime}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕕</span>
              <span>End: <strong>${formattedEndTime}</strong></span>
            </div>
          </div>

          <div class="reason-box">
            <h3 style="color: #DC2626; margin-top: 0;">Possible reasons for rejection:</h3>
            <div style="margin-top: 15px;">
              ${reason}
            </div>
          </div>

          <div class="divider"></div>

          <div style="text-align: center;">
            <p>We invite you to:</p>
            <ul style="list-style: none; padding: 0;">
              <li>✓ Try booking at a different time slot</li>
              <li>✓ Check availability of other parking spots</li>
              <li>✓ Look for nearby parking options</li>
            </ul>
          </div>

          <div class="footer">
            <p>Thank you for your understanding.</p>
            <p style="color: #94a3b8;">If you have any questions, don't hesitate to contact us</p>
            <p style="color: #94a3b8;">The Parkini Team 🚀</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { 
  getReservationConfirmationTemplate,
  getReservationRejectionTemplate 
};
