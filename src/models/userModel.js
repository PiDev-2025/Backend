const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  status:{type: String,
    enum: ['Active', 'Blocked'],
    required: false,
    default: undefined
  },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"] },
  vehicleType: {
    type: String,
    enum: ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV', 'Utilitaire'],
    required: false,
    default: undefined
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
