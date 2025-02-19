const Parking = require("../models/parkingModel");

// Create a new parking
const createParking = async (req, res) => {
  try {
    const parking = new Parking(req.body);
    await parking.save();
    res.status(201).json(parking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all parkings
const getParkings = async (req, res) => {
  try {
    const parkings = await Parking.find();
    res.status(200).json(parkings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single parking by ID
const getParkingById = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.id);
    if (!parking) {
      return res.status(404).json({ message: "Parking not found" });
    }
    res.status(200).json(parking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a parking
const updateParking = async (req, res) => {
  try {
    const updatedParking = await Parking.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Ensure validation
    });

    if (!updatedParking) {
      return res.status(404).json({ message: "Parking not found" });
    }

    res.status(200).json(updatedParking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a parking
const deleteParking = async (req, res) => {
  try {
    const deletedParking = await Parking.findByIdAndDelete(req.params.id);
    if (!deletedParking) {
      return res.status(404).json({ message: "Parking not found" });
    }
    res.status(200).json({ message: "Parking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createParking,
  getParkings,
  getParkingById,
  updateParking,
  deleteParking,
};