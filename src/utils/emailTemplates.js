const getParkingRequestEmailTemplate = (status, parkingName, ownerName) => {
  const statusText = status === 'accepted' ? 'acceptée' : 'refusée';
  const statusEmoji = status === 'accepted' ? '✅' : '❌';

  return {
    subject: `${statusEmoji} Mise à jour de votre demande de parking - ${statusText}`,
    message: `
Cher/Chère ${ownerName},

Nous vous informons que votre demande concernant le parking "${parkingName}" a été ${statusText}.

${status === 'accepted' ? `
🎉 Félicitations ! Votre parking a été validé et est maintenant visible sur notre plateforme.
Vous pouvez dès à présent :
- Gérer votre parking depuis votre tableau de bord
- Assigner des employés
- Suivre les réservations` : `
Malheureusement, votre demande n'a pas été approuvée. Voici quelques raisons possibles :
- Informations incomplètes
- Photos non conformes
- Emplacement non éligible

N'hésitez pas à soumettre une nouvelle demande en tenant compte de nos critères.`}

Pour toute question, notre équipe support reste à votre disposition.

Cordialement,
L'équipe Parkini
    `
  };
};

module.exports = {
  getParkingRequestEmailTemplate
};
