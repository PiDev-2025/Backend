const mongoose = require("mongoose");

const parkingRequestSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true,
  },
  nameP: { type: String, required: true },  
  location: { type: String, required: true },  
  totalSpots: { type: Number, required: true },  
  availableSpots: { type: Number, required: true },
  pricing: {
    perHour: { type: Number, required: true },
    perDay: { type: Number, required: false },
    perWeek: { type: Number, required: false }
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
  Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', default: null }
}, { timestamps: true });

parkingRequestSchema.index({ nameP: 1, location: 1, Owner: 1 }, { unique: true });

module.exports = mongoose.model("ParkingRequest", parkingRequestSchema);
