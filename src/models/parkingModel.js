const mongoose = require("mongoose");

const parkingSchema = new mongoose.Schema({
  nameP: { type: String, required: true },
  location: { type: String, required: true },
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
    perHour: { type: Number, required: true },
    perDay: { type: Number, required: true },
    perWeek: { type: Number, required: true }
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
  Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images: [String]
}, { timestamps: true });

parkingSchema.index({ nameP: 1, location: 1, Owner: 1 });

module.exports = mongoose.model("Parking", parkingSchema);
