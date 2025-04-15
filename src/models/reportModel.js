const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  parkingId: { type: String, required: true, ref: "Parking" },
  dateRange: { type: Date, required: true },
  totalRevenue: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);