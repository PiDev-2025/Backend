const getParkingRequestEmailTemplate = (status, parkingName, ownerName) => {
  const statusText = status === 'accepted' ? 'accepted' : 'rejected';
  const statusEmoji = status === 'accepted' ? '✅' : '❌';

  return {
    subject: `${statusEmoji} Parking Request Update - ${statusText}`,
    message: `
Dear ${ownerName},

We inform you that your request for parking "${parkingName}" has been ${statusText}.

${status === 'accepted' ? `
🎉 Congratulations! Your parking has been validated and is now visible on our platform.
You can now:
- Manage your parking from your dashboard
- Assign employees
- Track reservations` : `
Unfortunately, your request has not been approved. Here are some possible reasons:
- Incomplete information
- Non-compliant photos
- Ineligible location

Feel free to submit a new request taking into account our criteria.`}

For any questions, our support team remains at your disposal.

Best regards,
The Parkini Team
    `
  };
};

module.exports = {
  getParkingRequestEmailTemplate
};
