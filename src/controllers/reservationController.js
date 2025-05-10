const Reservation = require('../models/reservationModel');
const Parking = require('../models/parkingModel');

exports.createReservation = async (req, res) => {
  try {
    const { parkingId, startTime, endTime, vehicleType, spotId } = req.body;
    const userId = req.user.id;

    // Récupérer les informations du parking
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ message: 'Parking non trouvé' });
    }

    // Calculer le prix de base
    const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60); // en heures
    let totalPrice = duration * parking.pricing.hourlyRate;

    // Appliquer la réduction selon l'abonnement
    if (req.subscription) {
      const discountPercentage = req.subscription.features.priceDiscount;
      const discount = (totalPrice * discountPercentage) / 100;
      totalPrice -= discount;
    }

    // Créer la réservation
    const reservation = new Reservation({
      parkingId,
      userId,
      startTime,
      endTime,
      vehicleType,
      spotId,
      totalPrice,
      originalPrice: duration * parking.pricing.hourlyRate, // Prix avant réduction
      appliedDiscount: req.subscription?.features.priceDiscount || 0
    });

    await reservation.save();

    // Mettre à jour le nombre de places disponibles
    parking.availableSpots -= 1;
    await parking.save();

    res.status(201).json({
      ...reservation.toObject(),
      discountApplied: req.subscription?.features.priceDiscount || 0,
      savings: req.subscription ? 
        (duration * parking.pricing.hourlyRate) - totalPrice : 
        0
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ...rest of the existing controller methods...