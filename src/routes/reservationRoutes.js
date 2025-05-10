const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');
const { checkSubscriptionAccess } = require('../middlewares/subscriptionCheck');
const Parking = require('../models/parkingModel');
const Reservation = require('../models/reservationModel');
const User = require('../models/userModel');
const { 
  createReservationWithSubscriptionCheck,
  updateReservationStatus,
  checkAvailability,
  getUserByReservation,
  getReservationsByUserId,
  calculatePrice,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation,
  getOwnerReservations,
  updateReservationStatusPayment 
} = require('../services/reservationService');

// Apply subscription check middleware to all reservation routes
router.use(checkSubscriptionAccess);

// Base reservation CRUD routes with proper controller functions
router.post('/reservations', verifyToken, async (req, res) => {
  try {
    const reservation = await createReservationWithSubscriptionCheck(req.body, req.user);
    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/reservations', verifyToken, async (req, res) => {
  try {
    const reservations = await getReservations();
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reservations/:id', verifyToken, async (req, res) => {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.status(200).json(reservation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/reservations/:id', verifyToken, async (req, res) => {
  try {
    const updatedReservation = await updateReservation(req.params.id, req.body);
    res.status(200).json(updatedReservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/reservations/:id', verifyToken, async (req, res) => {
  try {
    await deleteReservation(req.params.id);
    res.status(200).json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// List all reservations
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

// User's reservations
router.get('/my-reservations', verifyToken, async (req, res) => {
  try {
    const reservations = await getReservationsByUserId(req.user.id);
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Owner routes
router.get('/owner-reservations', verifyToken, async (req, res) => {
  try {
    const reservations = await getOwnerReservations(req.user.id);
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

// Availability check
router.get('/reservations/by-spot', async (req, res) => {
  try {
    const { parkingId, spotId } = req.query;
    
    if (!parkingId || !spotId) {
      return res.status(400).json({ message: "parkingId et spotId sont requis" });
    }
    
    const reservations = await Reservation.find({
      parkingId,
      spotId,
      endTime: { $gte: new Date() }
    })
    .populate({
      path: 'userId',
      select: 'name email phone',
      model: 'User'
    })
    .populate('parkingId')
    .sort({ startTime: 1 });

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

router.post('/check-availability', verifyToken, async (req, res) => {
  try {
    const { parkingId, startTime, endTime } = req.body;

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

// Status updates
router.put('/reservations/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const reservation = await updateReservationStatus(req.params.id, status, req.user.id);
    res.json(reservation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/reservations/:id/statusPayment', verifyToken, updateReservationStatusPayment);

// Additional routes
router.get('/reservations/checkAvailability/:parkingId/:spotId', checkAvailability);
router.get('/reservations/:id/user', getUserByReservation);

router.get('/reservations/matricule/:matricule', verifyToken, async (req, res) => {
  try {
    const result = await getReservationsByMatricule(req.params.matricule);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
});

module.exports = router;
