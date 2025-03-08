const mongoose = require("mongoose");

const ParkingRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    required: true
  },
  totalSpots: { type: Number, required: true, min: 1 },
  vehicleType: {
    type: [String],
    enum: ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV', 'Utilitaire'],
    required: true,
    default: []
  },
  features: {
    type: [String],
    enum: ["Indoor Parking", "Underground Parking", "Unlimited Entrances & Exits", "Extension Available"],
    default: []
  },
  pricing: {
    hourly: { type: Number, required: true, min: 0 },
    daily: { type: Number, required: false, min: 0 },
    weekly: { type: Number, required: false, min: 0 },
    monthly: { type: Number, required: false, min: 0 },
  },
  images: { type: [String], required: false },
  id_owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ParkingRequest", ParkingRequestSchema);
