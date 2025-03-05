const mongoose = require("mongoose");

// Define a separate schema for position
const positionSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true }
}, { _id: false });  // _id: false prevents MongoDB from creating an _id for the subdocument

const parkingSchema = new mongoose.Schema({
  parkingId: { type: String, required: true, unique: true },
  nameP: { type: String, required: true },
  location: { type: String, required: true },
  totalSpots: { type: Number, required: true },
  availableSpots: { type: Number, required: true },
  pricing: { type: Number, required: true },
  position: { 
    type: positionSchema, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model("Parking", parkingSchema);