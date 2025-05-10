const Reservation = require('../models/reservationModel');
const Parking = require('../models/parkingModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

const createReservation = async (data) => {
  try {
    const reservation = new Reservation(data);
    await reservation.save();
    return reservation;
  } catch (error) {
    throw new Error(error.message);
  }
};

const createReservationWithSubscriptionCheck = async (data, user) => {
  try {
    // Get user's active subscription
    const subscription = await mongoose.model('Subscription').findOne({
      userId: user._id,
      status: 'Active',
      endDate: { $gt: new Date() }
    });

    if (!subscription) {
      throw new Error('No active subscription found. Please subscribe to make reservations.');
    }

    // Calculate duration in hours
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const duration = (endTime - startTime) / (1000 * 60 * 60);

    // Check reservation duration against subscription limit
    if (duration > subscription.features.maxReservationHours) {
      throw new Error(`Your subscription plan only allows reservations up to ${subscription.features.maxReservationHours} hours`);
    }

    // Check number of active reservations
    const activeReservations = await Reservation.countDocuments({
      userId: user._id,
      status: { $in: ['pending', 'accepted'] },
      endTime: { $gt: new Date() }
    });

    if (activeReservations >= subscription.features.maxActiveReservations) {
      throw new Error(`Your subscription plan only allows ${subscription.features.maxActiveReservations} active reservations`);
    }

    // Calculate price with subscription discount
    let price = await calculatePrice(data.parkingId, startTime, endTime, data.vehicleType);
    const discountedPrice = price * (1 - subscription.features.priceDiscount / 100);

    // Create reservation with discounted price
    const reservation = new Reservation({
      ...data,
      userId: user._id,
      originalPrice: price,
      totalPrice: discountedPrice,
      appliedDiscount: subscription.features.priceDiscount
    });

    await reservation.save();
    return reservation;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getReservations = async () => {
  try {
    return await Reservation.find()
      .populate('parkingId')
      .populate('userId')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(error.message);
  }
};

const getReservationById = async (id) => {
  try {
    return await Reservation.findById(id)
      .populate('parkingId')
      .populate('userId');
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateReservation = async (id, data) => {
  try {
    return await Reservation.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    throw new Error(error.message);
  }
};

const deleteReservation = async (id) => {
  try {
    await Reservation.findByIdAndDelete(id);
  } catch (error) {
    throw new Error(error.message);
  }
};

const getReservationsByUserId = async (userId) => {
  try {
    return await Reservation.find({ userId })
      .populate('parkingId')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(error.message);
  }
};

const getOwnerReservations = async (ownerId) => {
  try {
    const ownerParkings = await Parking.find({ ownerId });
    const parkingIds = ownerParkings.map(parking => parking._id);
    
    return await Reservation.find({ parkingId: { $in: parkingIds } })
      .populate('parkingId')
      .populate('userId')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateReservationStatus = async (reservationId, status, ownerId) => {
  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Réservation non trouvée');
    }

    const parking = await Parking.findById(reservation.parkingId);
    if (!parking) {
      throw new Error('Parking non trouvé');
    }

    if (parking.ownerId.toString() !== ownerId.toString()) {
      throw new Error('Non autorisé à modifier cette réservation');
    }

    reservation.status = status;
    await reservation.save();
    return reservation;
  } catch (error) {
    throw new Error(error.message);
  }
};

const updateReservationStatusPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (status) reservation.status = status;
    if (paymentStatus) reservation.paymentStatus = paymentStatus;
    
    await reservation.save();
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { parkingId, spotId } = req.params;
    const now = new Date();

    const activeReservation = await Reservation.findOne({
      parkingId,
      spotId,
      startTime: { $lte: now },
      endTime: { $gt: now },
      status: 'accepted'
    });

    res.json({ isAvailable: !activeReservation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserByReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('userId', '-password');
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation.userId);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const calculatePrice = async (parkingId, startTime, endTime, vehicleType) => {
  try {
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      throw new Error('Parking not found');
    }

    const duration = Math.ceil((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60));
    let basePrice = parking.pricing.baseRate || 0;

    // Apply vehicle type multiplier
    const vehicleMultiplier = {
      'Moto': 0.8,
      'Citadine': 1,
      'Berline / Petit SUV': 1.2,
      'Familiale / Grand SUV': 1.5,
      'Utilitaire': 1.8
    };

    basePrice *= vehicleMultiplier[vehicleType] || 1;

    // Calculate total price
    return basePrice * duration;
  } catch (error) {
    throw new Error(error.message);
  }
};

const getReservationsByMatricule = async (matricule) => {
  try {
    const reservations = await Reservation.find({ matricule })
      .populate('parkingId')
      .populate('userId')
      .sort({ createdAt: -1 });

    return {
      success: true,
      count: reservations.length,
      reservations
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  createReservation,
  createReservationWithSubscriptionCheck,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  getReservationsByUserId,
  getOwnerReservations,
  updateReservationStatus,
  updateReservationStatusPayment,
  checkAvailability,
  getUserByReservation,
  calculatePrice,
  getReservationsByMatricule
};