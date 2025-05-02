const Reservation = require("../models/reservationModel");
const Parking = require('../models/parkingModel');
const notificationService = require('../controllers/notificationController'); // Assurez-vous que le chemin est correct
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');
const Notification = require('../models/notificationModel'); // Assurez-vous que le chemin est correct
const nodemailer = require('nodemailer');
const { getReservationConfirmationTemplate } = require('../utils/reservationMailTemplate');

const calculatePrice = (startTime, endTime, pricing) => {
  const hours = Math.ceil((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60));
  let days = Math.floor(hours / 24);
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

/**
 * Vérifie le statut réel d'une place de parking en tenant compte des réservations
 * @param {String} spotId - L'ID de la place de parking
 * @param {String} currentStatus - Le statut actuel de la place dans la base de données
 * @returns {Promise<String>} - Le statut réel de la place: 'available', 'occupied', ou 'reserved'
 */
const checkRealSpotStatus = async (spotId, currentStatus) => {
  try {
    // Obtenir l'heure actuelle
    const now = new Date();
    
    // Chercher la réservation active ou prochaine pour cette place
    const activeReservation = await Reservation.findOne({
      spotId: spotId,
      status: 'accepted',
      endTime: { $gte: now }, // La réservation n'est pas encore terminée
      $or: [
        { startTime: { $lte: now } }, // La réservation a déjà commencé
        { startTime: { $lte: new Date(now.getTime() + 30 * 60000) } } // La réservation commence dans moins de 30 min
      ]
    }).sort({ startTime: 1 }); // Trier par heure de début pour obtenir la plus proche
    
    // Si aucune réservation n'est trouvée, la place est disponible
    if (!activeReservation) {
      return 'available';
    }
    
    // Calculer la différence en minutes entre maintenant et le début de la réservation
    const minutesUntilStart = Math.floor((activeReservation.startTime - now) / 60000);
    
    // Si la réservation a déjà commencé (entre startTime et endTime)
    if (now >= activeReservation.startTime && now <= activeReservation.endTime) {
      return 'reserved';
    }
    
    // Si la réservation commence dans moins de 30 minutes
    if (minutesUntilStart <= 30) {
      return 'occupied';
    }
    
    // Dans les autres cas, la place est disponible
    return 'available';
    
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de la place:', error);
    // En cas d'erreur, on retourne le statut actuel pour ne pas bloquer le système
    return currentStatus;
  }
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
    console.log("parking dataaa ", parking);

    // Créer la notification
    await notificationService.createNotification({
      driverId: reservationData.userId,
      ownerId: parking.get('Owner'),
      parkingId: reservationData.parkingId,
      reservationId: reservation._id,
      status: 'en_attente'
    });

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

  const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'canceled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Statut de réservation invalide');
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new Error('Réservation non trouvée');
  }

  if (newStatus === 'accepted') {
    // Récupérer les informations complètes de la réservation
    const reservation = await Reservation.findById(reservationId)
      .populate('userId')
      .populate('parkingId');

    // Rejeter les réservations qui se chevauchent
    const overlappingReservations = await Reservation.find({
      _id: { $ne: reservationId },
      parkingId: reservation.parkingId,
      spotId: reservation.spotId,
      status: { $in: ['pending', 'accepted'] },
      $or: [
        {
          startTime: { $lt: reservation.endTime },
          endTime: { $gt: reservation.startTime }
        }
      ]
    });

    // Rejeter toutes les réservations qui se chevauchent
    for (const overlap of overlappingReservations) {
      overlap.status = 'rejected';
      await overlap.save();
      
      await Notification.findOneAndUpdate(
        { reservationId: overlap._id },
        { 
          status: 'refusée',
          isRead: false
        },
        { new: true }
      );
    }

    // Génération du QR code en base64
    const qrData = JSON.stringify({
      reservationId: reservation._id,
      parkingName: reservation.parkingId.name,
      driverName: reservation.userId.name,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      totalPrice: reservation.totalPrice,
      vehicleType: reservation.vehicleType
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    // Extraire seulement la partie base64 de l'URL de données
    const base64QR = qrCodeDataUrl.split(',')[1];

    // Configuration du transporteur d'email avec les images intégrées
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Préparer et envoyer l'email avec l'image QR intégrée
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: reservation.userId.email,
      subject: 'Confirmation de votre réservation de parking',
      html: getReservationConfirmationTemplate(
        reservation.userId.name,
        reservation.parkingId.name,
        'cid:qrcode', // Référence à l'image intégrée
        reservation.startTime,
        reservation.endTime,
        reservation.spotId
      ),
      attachments: [{
        filename: 'qrcode.png',
        content: base64QR,
        encoding: 'base64',
        cid: 'qrcode' // même identifiant que dans le template
      }]
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email de confirmation envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  }

  // Mettre à jour le statut de la réservation actuelle
  reservation.status = newStatus;
  await reservation.save();

  // Mettre à jour la notification existante au lieu d'en créer une nouvelle
  await Notification.findOneAndUpdate(
    { reservationId: reservationId },
    { 
      status: newStatus === 'accepted' ? 'acceptée' : 'refusée',
      isRead: false
    },
    { new: true }
  );

  return reservation;
}

const checkAvailability = async (req, res) => {
  try {
    const { parkingId, spotId } = req.params;
    const { startTime, endTime } = req.query;
    
    // Validation des paramètres
    if (!isValidObjectId(parkingId)) {
      return res.status(400).json({ success: false, message: 'ID de parking invalide' });
    }
    
    if (!spotId || !spotId.startsWith('parking-spot-')) {
      return res.status(400).json({ success: false, message: 'ID de place invalide' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Les dates de début et de fin sont requises' });
    }
    
    // Conversion et validation des dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Dates invalides' });
    }
    
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'La date de fin doit être après la date de début' });
    }
    
    if (start < new Date()) {
      return res.status(400).json({ success: false, message: 'La date de début ne peut pas être dans le passé' });
    }
    
    // Recherche des réservations existantes qui se chevauchent avec la période demandée
    const overlappingReservations = await Reservation.find({
      parkingId,
      spotId,
      status: { $nin: ['rejected', 'canceled'] },
      $or: [
        // Début de réservation pendant la période demandée
        { startTime: { $lt: end, $gte: start } },
        // Fin de réservation pendant la période demandée
        { endTime: { $gt: start, $lte: end } },
        // Réservation englobant complètement la période demandée
        { startTime: { $lte: start }, endTime: { $gte: end } }
      ]
    });
    
    const isAvailable = overlappingReservations.length === 0;
    
    return res.status(200).json({
      success: true,
      isAvailable,
      message: isAvailable 
        ? 'La place est disponible pour cette période' 
        : 'La place n\'est pas disponible pour cette période',
      overlappingReservations: isAvailable ? [] : overlappingReservations
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification de disponibilité:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification de disponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

const getUserByReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id).populate('userId');

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.status(200).json({
      reservationId: reservation._id,
      user: reservation.userId, // this contains the populated user document
    });
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

// Fonction pour récupérer les réservations des parkings d'un propriétaire
const getOwnerReservations = async (ownerId) => {
  try {
    // Trouver tous les parkings appartenant à ce propriétaire
    const ownerParkings = await Parking.find({ Owner: ownerId });
    
    if (!ownerParkings || ownerParkings.length === 0) {
      return [];
    }
    
    const parkingIds = ownerParkings.map(parking => parking._id);
    
    // Trouver toutes les réservations pour ces parkings
    const reservations = await Reservation.find({ 
      parkingId: { $in: parkingIds }
    })
      .populate('parkingId')
      .populate('userId', 'name email phone') // Inclure seulement les infos nécessaires de l'utilisateur
      .sort({ createdAt: -1 });

    return reservations;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des réservations du propriétaire:", error);
    throw error;
  }
};

module.exports = {
  checkAvailability,
  createReservation,
  updateReservationStatus,
  calculatePrice,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  checkRealSpotStatus,
  getUserByReservation,
  getOwnerReservations
};