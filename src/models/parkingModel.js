const mongoose = require("mongoose");


const parkingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  totalSpots: { type: Number, required: true, min: 1 },
  availableSpots: { type: Number, required: false },
  pricing: {
    hourly: { type: Number, required: true, min: 0 },
    daily: { type: Number, required: false, min: 0 },
    weekly: { type: Number, required: false, min: 0 },
    monthly: { type: Number, required: false, min: 0 },
  },
  /*pricing: { type: Number, required: true },*/
  position: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    required: true
  },
  features: {
    type: [String],
    enum: ["Indoor Parking", "Underground Parking", "Unlimited Entrances & Exits", "Extension Available"],
    default: []
  },
  images: { type: [String], required: false },

  id_owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

  createdAt: { type: Date, default: Date.now },
  
}, { timestamps: true });

module.exports = mongoose.model("Parking", parkingSchema);