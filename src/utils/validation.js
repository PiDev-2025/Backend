function validateParkingData(data) {
    const { nameP, location, totalSpots, availableSpots, pricing, vehicleTypes } = data;
  
    if (!nameP || !location || !totalSpots || !availableSpots || !pricing || !vehicleTypes) {
      return "Tous les champs sont obligatoires.";
    }
  
    if (isNaN(totalSpots) || isNaN(availableSpots) || totalSpots <= 0 || availableSpots < 0) {
      return "Le nombre total de places et les places disponibles doivent être des nombres valides.";
    }
  
    return null; // Aucune erreur
  }
  
  module.exports = { validateParkingData };
  