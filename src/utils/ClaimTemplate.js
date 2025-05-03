const getClaimStatusUpdateTemplate = (userName, claimId, newStatus, parkingName, ownerMessage = '') => {
  const statusMessages = {
    'resolved': {
      title: '✅ Your claim has been resolved',
      message: 'We are pleased to inform you that your claim has been resolved.'
    },
    'rejected': {
      title: '❌ Update on your claim',
      message: 'Your claim has been reviewed but could not be validated.'
    },
    'in_progress': {
      title: '🔄 Your claim is being processed',
      message: 'We are currently working on resolving your claim.'
    }
  };

  const status = statusMessages[newStatus] || {
    title: '📝 Update on your claim',
    message: 'There has been an update to your claim.'
  };

  return {
    subject: status.title,
    message: `
Dear ${userName},

${status.message}

Claim Details:
- Claim ID: ${claimId}
- Parking: ${parkingName}
- New Status: ${newStatus}

${ownerMessage ? `Message from parking owner:\n${ownerMessage}\n` : ''}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Parkini Team
    `
  };
};

// Corriger l'exportation
module.exports = { getClaimStatusUpdateTemplate };  // Modifier cette ligne