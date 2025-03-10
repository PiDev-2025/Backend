const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: Number },
  status: { 
    type: String,
    enum: ['Active', 'Blocked'],
    required: false,
    default: 'Active'
  },
  role: { type: String, enum: ["Owner", "Driver", "Admin", "Employe"] },
  vehicleType: {
    type: String,
    enum: ['Moto', 'Citadine', 'Berline / Petit SUV', 'Familiale / Grand SUV', 'Utilitaire'],
    required: false,
    default: undefined
  },
  image: { type: String, default: 'https://res.cloudinary.com/dpcyppzpw/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1740761212/profile-user-icon_h3njnr.jpg' },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Favorite' }]
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
