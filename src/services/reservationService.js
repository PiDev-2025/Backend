const Reservation = require("../models/reservationModel");
const Parking = require('../models/parkingModel');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

const calculatePrice = (startTime, endTime, pricing) => {
  const hours = Math.ceil((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let totalPrice = 0;

  if (days >= 30 && pricing.monthly) {
    const months = Math.floor(days / 30);
    totalPrice += months * pricing.monthly;
    days = days % 30;
  }

  if (days >= 7 && pricing.weekly) {
    const weeks = Math.floor(days / 7);
    totalPrice += weeks * pricing.weekly;
    days = days % 7;
  }

  if (days > 0 && pricing.daily) {
    totalPrice += days * pricing.daily;
  }

  if (remainingHours > 0) {
    totalPrice += remainingHours * pricing.hourly;
  }

  return totalPrice;
};

const generateQRCode = async (reservationData) => {
  const qrData = JSON.stringify({
    reservationId: reservationData._id,
    parkingName: reservationData.parkingId.name,
    driverName: reservationData.userId.name,
    startTime: reservationData.startTime,
    endTime: reservationData.endTime,
    totalPrice: reservationData.totalPrice,
    vehicleType: reservationData.vehicleType
  });

  return await QRCode.toDataURL(qrData);
};

const createReservation = async (reservationData) => {
  try {
    console.log("Création d'une réservation avec données:", reservationData);

    // Vérifier la disponibilité du parking
    const parking = await Parking.findById(reservationData.parkingId);
    if (!parking) {
      throw new Error('Parking non trouvé');
    }

    const reservation = new Reservation({
      parkingId: reservationData.parkingId,
      spotId: reservationData.spotId,
      userId: reservationData.userId,
      startTime: reservationData.startTime,
      endTime: reservationData.endTime,
      vehicleType: reservationData.vehicleType,
      totalPrice: reservationData.totalPrice,
      paymentMethod: reservationData.paymentMethod || 'cash',
      status: 'pending'
    });

    // Générer le QR code après la sauvegarde initiale
    await reservation.save();

    const qrCodeData = JSON.stringify({
      id: reservation._id.toString(),
      parkingName: parking.name,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      vehicleType: reservation.vehicleType,
      totalPrice: reservation.totalPrice
    });

    reservation.qrCode = await QRCode.toDataURL(qrCodeData);
    await reservation.save();
    await notificationService.createReservationNotification(reservation, parking);

    console.log("✅ Réservation créée avec succès:", reservation);
    return reservation;
  } catch (error) {
    console.error("❌ Erreur création réservation:", error);
    throw error;
  }
};

// Fonction pour mettre à jour le statut d'une réservation
async function updateReservationStatus(reservationId, newStatus, userId) {
  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    throw new Error('ID de réservation invalide');
  }

  // Vérifier que le statut est valide selon votre modèle
  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'canceled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Statut de réservation invalide');
  }

  const reservation = await Reservation.findOneAndUpdate(
    { _id: reservationId },
    { status: newStatus },
    { new: true, runValidators: true }
  );

  if (!reservation) {
    throw new Error('Réservation non trouvée');
  }

  return reservation;
}

const getReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('parkingId')
      .populate('userId');
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('parkingId')
      .populate('userId');
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateReservation = async (req, res) => {
  try {
    const updatedReservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    // Restaurer la place de parking
    const parking = await Parking.findById(reservation.parkingId);
    if (parking && reservation.status === 'accepted') {
      parking.availableSpots += 1;
      await parking.save();
    }

    await reservation.remove();
    res.status(200).json({ message: 'Réservation supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReservation,
  updateReservationStatus,
  calculatePrice,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation
};