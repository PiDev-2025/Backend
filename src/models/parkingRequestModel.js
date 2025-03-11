const mongoose = require("mongoose");

const parkingRequestSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  name: { type: String, required: true },
  description: { type: String }, 
  position: { 
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  totalSpots: { type: Number, required: true },  
  availableSpots: { type: Number, required: true },
  pricing: {
    hourly: { type: Number, required: true, min: 0 },
    daily: { type: Number, required: false, min: 0 },
    weekly: { type: Number, required: false, min: 0 },
    monthly: { type: Number, required: false, min: 0 },
  },
  vehicleTypes: {
    type: [String],
    enum: ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV', 'Utilitaire'],
    required: true
  },
  images: { type: [String], required: true },  // ✅ Ajout des images
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  features: {
    type: [String],
    enum: ["Indoor Parking", "Underground Parking", "Unlimited Entrances & Exits", "Extension Available"],
    default: []
  },
  Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', default: null },
  id_employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
}, { timestamps: true });

parkingRequestSchema.index({ name: 1, position: 1, Owner: 1 }, { unique: true });

module.exports = mongoose.model("ParkingRequest", parkingRequestSchema);
