const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({
  parkingId: { type: String, required: true, unique: true },
  nameP: { type: String, required: true },
  location: { type: String, required: true },
  totalSpots: { type: Number, required: true },
  availableSpots: { type: Number, required: true },
  pricing: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Parking", parkingSchema);