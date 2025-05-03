const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');
const Parking = require('../models/parkingModel');
const Reservation = require('../models/reservationModel');
const User = require('../models/userModel');
const { createReservation, updateReservationStatus, checkAvailability,getUserByReservation,  calculatePrice, getReservations, getReservationById, updateReservation, deleteReservation, getOwnerReservations } = require('../services/reservationService');

// Création de réservation
router.post('/reservations', verifyToken, async (req, res) => {
  try {
    console.log("Données reçues pour la réservation:", req.body);

    const { parkingId, startTime, endTime, vehicleType, totalPrice, paymentMethod, spotId } = req.body;

    // Validation des données
    if (!parkingId || !startTime || !endTime || !vehicleType || totalPrice === undefined || !spotId) {
      return res.status(400).json({
        message: 'Toutes les informations requises doivent être fournies',
        received: { parkingId, startTime, endTime, vehicleType, totalPrice }
      });
    }

    // Vérifier si le parking existe
    const parking = await Parking.findById(parkingId);
    if (!parking) {
      return res.status(404).json({ message: 'Parking non trouvé' });
    }
    const reservationData = {
      parkingId,
      userId: req.user.id,
      startTime,
      endTime,
      vehicleType,
      totalPrice,
      paymentMethod: paymentMethod || 'cash',
      spotId,
    };

    console.log("Données de réservation formatées:", reservationData);

    const reservation = await createReservation(reservationData); // Utilisation du service
    console.log("Réservation créée:", reservation);

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Erreur de création de réservation:", error);
    res.status(400).json({
      message: error.message || 'Erreur lors de la création de la réservation',
      details: error.stack
    });
  }
});

// Liste de toutes les réservations

router.get('/list-all', async (req, res) => {

  try {
    const reservations = await Reservation.find()
      .populate({
        path: 'parkingId',
        select: 'name location pricing'
      })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`✅ ${reservations.length} réservations trouvées`);
    res.status(200).json(reservations);
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des réservations",
      error: error.message
    });
  }
});

// Mes réservations (pour l'utilisateur connecté)
router.get('/reservations/my-reservations', verifyToken, async (req, res) => {
  try {
    console.log("🔍 Recherche des réservations pour l'utilisateur:", req.user.id);

    const userReservations = await Reservation.find({
      userId: req.user.id
    })
      .populate({
        path: 'parkingId',
        select: 'name position location pricing totalSpots availableSpots',
        // Assurez-vous que toutes les données nécessaires sont sélectionnées
      })
      .sort({ createdAt: -1 });

    // Validation et transformation des données
    const formattedReservations = userReservations.map(reservation => {
      // Vérification de l'existence du parking
      if (!reservation.parkingId) {
        console.warn(`⚠️ Réservation ${reservation._id} sans parking associé`);
        return null;
      }

      // Log de débogage pour la position du parking
      console.log(`📍 Position du parking ${reservation.parkingId._id}:`,
        reservation.parkingId.position);

      return {
        _id: reservation._id,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status: reservation.status,
        vehicleType: reservation.vehicleType,
        totalPrice: reservation.totalPrice,
        qrCode: reservation.qrCode,
        parkingId: {
          _id: reservation.parkingId._id,
          name: reservation.parkingId.name,
          position: reservation.parkingId.position,
          location: reservation.parkingId.location,
          pricing: reservation.parkingId.pricing,
          totalSpots: reservation.parkingId.totalSpots,
          availableSpots: reservation.parkingId.availableSpots
        },
        createdAt: reservation.createdAt
      };
    }).filter(Boolean); // Supprime les réservations null

    console.log(`✅ ${formattedReservations.length} réservations formatées`);
    res.status(200).json(formattedReservations);
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des réservations",
      error: error.message
    });
  }
});

// Nouvelles routes pour les propriétaires de parking
// Route pour obtenir les réservations des parkings d'un propriétaire
router.get('/owner-reservations', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un propriétaire
    if (req.user.role !== 'Owner') {
      return res.status(403).json({ message: 'Accès refusé. Vous devez être propriétaire pour accéder à cette ressource.' });
    }

    const ownerId = req.user.id;
    console.log("🔍 Recherche des réservations pour le propriétaire:", ownerId);

    // Trouver tous les parkings appartenant à ce propriétaire
    const ownerParkings = await Parking.find({ Owner: ownerId });
    
    if (!ownerParkings || ownerParkings.length === 0) {
      return res.status(200).json([]);
    }
    
    const parkingIds = ownerParkings.map(parking => parking._id);
    
    // Trouver toutes les réservations pour ces parkings
    const reservations = await Reservation.find({ 
      parkingId: { $in: parkingIds }
    })
      .populate('parkingId')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    console.log(`✅ ${reservations.length} réservations trouvées pour les parkings du propriétaire`);
    res.status(200).json(reservations);
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des réservations",
      error: error.message
    });
  }
});

// Route pour qu'un propriétaire accepte ou rejette une réservation
router.put('/owner-reservations/:id/status', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'Owner') {
      return res.status(403).json({ message: 'Accès refusé. Vous devez être propriétaire pour effectuer cette action.' });
    }

    const { status } = req.body;
    const reservationId = req.params.id;
    const ownerId = req.user.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide. Le statut doit être "accepted" ou "rejected".' });
    }

    const updatedReservation = await updateReservationStatus(reservationId, status, ownerId);

    res.status(200).json({ 
      message: `Réservation ${status === 'accepted' ? 'acceptée' : 'refusée'} avec succès`,
      reservation: updatedReservation
    });
  } catch (error) {
    console.error("❌ Erreur:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/reservations/by-spot', async (req, res) => {
  try {
    const { parkingId, spotId } = req.query;
    
    if (!parkingId || !spotId) {
      return res.status(400).json({ message: "parkingId et spotId sont requis" });
    }
    
    // Récupérer les réservations pour cette place de parking avec les détails de l'utilisateur
    const reservations = await Reservation.find({
      parkingId,
      spotId,
      endTime: { $gte: new Date() }
    })
    .populate({
      path: 'userId',
      select: 'name email phone', // Sélectionner explicitement les champs de l'utilisateur
      model: 'User' // Spécifier explicitement le modèle
    })
    .populate('parkingId')
    .sort({ startTime: 1 });

    // Formater les données pour inclure les informations client
    const formattedReservations = reservations.map(reservation => ({
      ...reservation.toObject(),
      client: {
        name: reservation.userId?.name || 'N/A',
        phone: reservation.userId?.phone || 'N/A',
        email: reservation.userId?.email || 'N/A'
      }
    }));
    
    res.json(formattedReservations);
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Vérification de disponibilité
router.post('/check-availability', verifyToken, async (req, res) => {
  try {
    const { parkingId, startTime, endTime } = req.body;

    // Vérifier les réservations existantes qui se chevauchent
    const overlappingReservations = await Reservation.find({
      parkingId,
      status: 'accepted',
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    const parking = await Parking.findById(parkingId);
    const availableSpots = parking.totalSpots - overlappingReservations.length;

    res.json({
      available: availableSpots > 0,
      availableSpots,
      overlappingReservations: overlappingReservations.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mise à jour du statut
router.put('/reservations/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await updateReservationStatus(req.params.id, status, req.user.id);
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    console.log("🗑️ Tentative de suppression de la réservation:", req.params.id);

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    // Vérifier que l'utilisateur est autorisé à supprimer cette réservation
    if (reservation.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé à supprimer cette réservation' });
    }

    // Mettre à jour le nombre de places disponibles dans le parking
    const parking = await Parking.findById(reservation.parkingId);
    if (parking && reservation.status === 'accepted') {
      parking.availableSpots += 1;
      await parking.save();
    }

    await Reservation.findByIdAndDelete(req.params.id);
    console.log("✅ Réservation supprimée avec succès");

    res.status(200).json({ message: 'Réservation supprimée avec succès' });
  } catch (error) {
    console.error("❌ Erreur lors de la suppression:", error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la réservation' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de réservation invalide' });
    }

    const reservation = await Reservation.findById(req.params.id)
      .populate('parkingId')
      .populate('userId', 'name email');

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    res.status(200).json(reservation);
  } catch (error) {
    console.error("❌ Erreur récupération réservation:", error);
    res.status(500).json({ message: error.message });
  }
});
router.get('/reservations/checkAvailability/:parkingId/:spotId', checkAvailability);
router.get("/reservations/:id/user", getUserByReservation);


module.exports = router;
