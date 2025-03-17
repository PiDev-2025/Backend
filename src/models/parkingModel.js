const mongoose = require("mongoose");

const ParkingSpotSchema = new mongoose.Schema({
  id: String,
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  rotation: Number,
  type: {
    type: String,
    enum: ['standard', 'handicap', 'electric', 'compact', 'large'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance'],
    default: 'available'
  },
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reservationTime: Date
});

// Nouveau schéma pour les rues
const StreetSchema = new mongoose.Schema({
  id: String,
  x: Number,
  y: Number,
  width: Number,
  length: Number,
  rotation: Number,
  hasEntrance: Boolean,
  hasExit: Boolean
});

// Mise à jour du schéma layout pour inclure les rues
const LayoutSchema = new mongoose.Schema({
  width: Number,
  height: Number,
  backgroundImage: String,
  backgroundColor: String,
  streets: [StreetSchema] // Ajout de la collection de rues
});

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
      validator: function(v) {
        return v <= this.totalSpots;
      },
      message: props => `Le nombre de places disponibles ne peut pas dépasser le nombre total de places`
    }
  },
  layout: {
    width: Number,
    height: Number,
    backgroundImage: String,
    backgroundColor: String
  },
  spots: [ParkingSpotSchema],
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
  layout: LayoutSchema, 
  features: {
    type: [String],
    enum: ["Indoor Parking", "Underground Parking", "Unlimited Entrances & Exits", "Extension Available"],
    default: []
  },
  Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id_employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  images: [String]
}, { timestamps: true });

parkingSchema.index({ name: 1, position: 1, Owner: 1 });

module.exports = mongoose.model("Parking", parkingSchema);