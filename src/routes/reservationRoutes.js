const express = require("express");
const router = express.Router();
const {
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  deleteReservation
} = require("../services/reservationService");

router.post("/reservations", createReservation);
router.get("/reservations", getReservations);
router.get("/reservations/:id", getReservationById);
router.put("/reservations/:id", updateReservation);
router.delete("/reservations/:id", deleteReservation);

module.exports = router;