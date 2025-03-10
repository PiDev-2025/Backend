const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  position: { 
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },

  totalSpots: { type: Number, required: true },
  availableSpots: {
    type: Number,
    required: true,
    validate: {
      validator: function (v) {
        return v <= this.totalSpots;
      },
      message: props => `Le nombre de places disponibles ne peut pas dépasser le nombre total de places`
    }
  },
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
  images: [String]
}, { timestamps: true });

parkingSchema.index({ name: 1, position: 1, Owner: 1 });

module.exports = mongoose.model("Parking", parkingSchema);
