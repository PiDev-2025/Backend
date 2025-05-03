const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    parkingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parking",
      required: true,
    },
    spotId: {
      type: String,
      required: [true, "L'ID de la place est requis"],
      validate: {
        validator: function (v) {
          return v.startsWith("parking-spot-");
        },
        message: "L'ID de place doit commencer par parking-spot-",
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleType: {
      type: String,
      required: true,
      enum: [
        "Moto",
        "Citadine",
        "Berline / Petit SUV",
        "Familiale / Grand SUV",
        "Utilitaire",
      ],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "canceled"],
      default: "pending",
    },
    qrCode: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      required: true,
    },
  },
  { timestamps: true }
);

reservationSchema.index({ userId: 1 });
reservationSchema.index({ parkingId: 1 });
reservationSchema.index({ createdAt: -1 });

// Virtual pour générer un ID lisible
reservationSchema.virtual("displayId").get(function () {
  return `RES-${this._id}`;
});

reservationSchema.set("toJSON", { virtuals: true });
reservationSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Reservation", reservationSchema);
