const Parking = require("../models/parkingModel");

// Create a new parking
const createParking = async (req, res) => {
  try {
    console.log("Request body:", JSON.stringify(req.body));
    
    // Validate the position data
    if (!req.body.position || typeof req.body.position.lat !== 'number' || typeof req.body.position.lon !== 'number') {
      return res.status(400).json({ 
        message: "Position data is required with valid lat and lon values" 
      });
    }
    
    // Create the parking document with explicitly defined position
    const parkingData = {
      ...req.body,
      position: {
        lat: req.body.position.lat,
        lon: req.body.position.lon
      }
    };
    
    const parking = new Parking(parkingData);
    const savedParking = await parking.save();
    
    console.log("Saved parking:", JSON.stringify(savedParking));
    res.status(201).json(savedParking);
  } catch (error) {
    console.error("Error creating parking:", error);
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
    // Validate position if it's being updated
    if (req.body.position && (typeof req.body.position.lat !== 'number' || typeof req.body.position.lon !== 'number')) {
      return res.status(400).json({ 
        message: "Position data must have valid lat and lon values" 
      });
    }
    
    let updateData = req.body;
    
    // Ensure position is properly structured if it's included in the update
    if (req.body.position) {
      updateData = {
        ...req.body,
        position: {
          lat: req.body.position.lat,
          lon: req.body.position.lon
        }
      };
    }

    const updatedParking = await Parking.findByIdAndUpdate(req.params.id, updateData, {
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