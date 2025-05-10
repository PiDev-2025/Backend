const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['Free', 'Standard', 'Premium'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  features: {
    maxReservationHours: {
      type: Number,
      required: true
    },
    maxActiveReservations: {
      type: Number,
      required: true
    },
    cancellationHours: {
      type: Number,
      required: true
    },
    priceDiscount: {
      type: Number,
      required: true
    },
    hasAds: {
      type: Boolean,
      required: true
    },
    carWashPerMonth: {
      type: Number,
      required: true
    },
    supportPriority: {
      type: String,
      enum: ['standard', 'priority', 'vip'],
      required: true
    }
  },
  description: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;