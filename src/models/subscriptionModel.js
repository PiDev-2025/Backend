const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['Free', 'Standard', 'Premium'],
    required: true
  },
  features: {
    maxReservationHours: {
      type: Number,
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 24;
          case 'Standard': return 12;
          default: return 2;
        }
      }
    },
    maxActiveReservations: {
      type: Number,
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 999;
          case 'Standard': return 3;
          default: return 1;
        }
      }
    },
    cancellationHours: {
      type: Number,
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 0.5;
          case 'Standard': return 2;
          default: return 0;
        }
      }
    },
    priceDiscount: {
      type: Number,
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 15;
          case 'Standard': return 5;
          default: return 0;
        }
      }
    },
    hasAds: {
      type: Boolean,
      required: true,
      default: function() {
        return this.plan === 'Free';
      }
    },
    carWashPerMonth: {
      type: Number,
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 2;
          case 'Standard': return 1;
          default: return 0;
        }
      }
    },
    supportPriority: {
      type: String,
      enum: ['standard', 'priority', 'vip'],
      required: true,
      default: function() {
        switch (this.plan) {
          case 'Premium': return 'vip';
          case 'Standard': return 'priority';
          default: return 'standard';
        }
      }
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Expired'],
    default: 'Active'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  cancelDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Static method to create default subscription plans
subscriptionSchema.statics.createDefaultPlans = async function() {
  const plans = [
    {
      name: "Parkini Free",
      plan: "Free",
      price: 0,
      description: "Basic parking features",
      features: {
        maxReservationHours: 2,
        maxActiveReservations: 1,
        cancellationHours: 0,
        priceDiscount: 0,
        hasAds: true,
        carWashPerMonth: 0,
        supportPriority: 'standard'
      }
    },
    {
      name: "Parkini Standard",
      plan: "Standard",
      price: 29.99,
      description: "Enhanced parking experience with priority support",
      features: {
        maxReservationHours: 12,
        maxActiveReservations: 3,
        cancellationHours: 2,
        priceDiscount: 5,
        hasAds: false,
        carWashPerMonth: 1,
        supportPriority: 'priority'
      }
    },
    {
      name: "Parkini Premium",
      plan: "Premium",
      price: 49.99,
      description: "Ultimate parking experience with VIP benefits",
      features: {
        maxReservationHours: 24,
        maxActiveReservations: 999,
        cancellationHours: 0.5,
        priceDiscount: 15,
        hasAds: false,
        carWashPerMonth: 2,
        supportPriority: 'vip'
      }
    }
  ];

  try {
    for (const plan of plans) {
      await this.findOneAndUpdate(
        { plan: plan.plan },
        plan,
        { upsert: true, new: true }
      );
    }
    console.log('Default subscription plans created successfully');
  } catch (error) {
    console.error('Error creating default subscription plans:', error);
    throw error;
  }
};

// Static method to create a default free subscription for a new user
subscriptionSchema.statics.createDefaultSubscription = async function(userId) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const subscription = new this({
    userId,
    plan: 'Free',
    features: {
      maxReservationHours: 2,
      maxActiveReservations: 1,
      cancellationHours: 0,
      priceDiscount: 0,
      hasAds: true,
      carWashPerMonth: 0,
      supportPriority: 'standard'
    },
    startDate,
    endDate,
    status: 'Active',
    paymentStatus: 'completed'
  });

  return subscription.save();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;