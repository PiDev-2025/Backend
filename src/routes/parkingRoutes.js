const express = require("express");
const router = express.Router();
const { 
  createParking, 
  getParkings, 
  getParkingById, 
  updateParking, 
  deleteParking 
} = require("../services/parkingService");

router.post("/parkings", createParking);
router.get("/parkings", getParkings);
router.get("/parkings/:id", getParkingById); // Get parking by ID
router.put("/parkings/:id", updateParking); // Update parking
router.delete("/parkings/:id", deleteParking); // Delete parking

module.exports = router;