const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({ 
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"]},
  vehicleType: {
    type: String,
    enum: ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV','Utilitaire'],
    required: false,
    default: undefined 
},
  otp: { type: String, required: false },
  otpExpires: { type: Date, required: false },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);