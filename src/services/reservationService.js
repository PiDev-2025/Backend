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

    console.log("✅ Réservation créée avec succès:", reservation);
    return reservation;
  } catch (error) {
    console.error("❌ Erreur création réservation:", error);
    throw error;
  }
};

const updateReservationStatus = async (reservationId, status, userId) => {
  try {
    const reservation = await Reservation.findById(reservationId)
      .populate('parkingId')
      .populate('userId');

    if (!reservation) throw new Error('Réservation non trouvée');

    // Vérifier si l'utilisateur est le propriétaire ou l'employé du parking
    const parking = await Parking.findById(reservation.parkingId);
    if (parking.Owner.toString() !== userId && parking.id_employee?.toString() !== userId) {
      throw new Error('Non autorisé à modifier cette réservation');
    }

    reservation.status = status;
    if (status === 'accepted') {
      // Mettre à jour le nombre de places disponibles
      parking.availableSpots -= 1;
      await parking.save();
    }

    await reservation.save();
    return reservation;
  } catch (error) {
    throw error;
  }
};

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
    console.log("🔍 Attempting to delete reservation with ID:", req.params.id);

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      console.warn("⚠️ Réservation non trouvée:", req.params.id);
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    // Restaurer la place de parking
    const parking = await Parking.findById(reservation.parkingId);
    if (parking) {
      console.log("🔄 Found parking for reservation:", parking._id);
      if (reservation.status === 'accepted') {
        parking.availableSpots += 1;
        await parking.save();
        console.log("✅ Parking spots restored. Available spots:", parking.availableSpots);
      }
    } else {
      console.warn("⚠️ Parking non trouvé pour la réservation:", reservation.parkingId);
    }

    await Reservation.findByIdAndDelete(reservation._id); // Use findByIdAndDelete instead of remove
    console.log("✅ Réservation supprimée avec succès:", reservation._id);
    res.status(200).json({ message: 'Réservation supprimée' });
  } catch (error) {
    console.error("❌ Erreur suppression réservation:", error);
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