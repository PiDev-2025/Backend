const Subscription = require('../models/subscriptionModel');
const User = require('../models/userModel');

// Get user's active subscription
const getActiveSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'Active'
    });
    
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change subscription plan
const changePlan = async (req, res) => {
  try {
    const { newPlan } = req.body;
    const userId = req.user.id;

    // Validate plan type
    if (!['Free', 'Standard', 'Premium'].includes(newPlan)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    // Get current subscription
    const currentSubscription = await Subscription.findOne({
      userId,
      status: 'Active'
    });

    if (!currentSubscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    // If downgrading to free plan
    if (newPlan === 'Free') {
      // Mark current subscription as cancelled
      currentSubscription.status = 'Cancelled';
      currentSubscription.cancelDate = new Date();
      await currentSubscription.save();

      // Create new free subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const newSubscription = new Subscription({
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

      await newSubscription.save();
      return res.json(newSubscription);
    }

    // If upgrading or switching between paid plans
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const features = {
      maxReservationHours: newPlan === 'Premium' ? 24 : 12,
      maxActiveReservations: newPlan === 'Premium' ? 999 : 3,
      cancellationHours: newPlan === 'Premium' ? 0.5 : 2,
      priceDiscount: newPlan === 'Premium' ? 15 : 5,
      hasAds: false,
      carWashPerMonth: newPlan === 'Premium' ? 2 : 1,
      supportPriority: newPlan === 'Premium' ? 'vip' : 'priority'
    };

    // Create new subscription
    const newSubscription = new Subscription({
      userId,
      plan: newPlan,
      features,
      startDate,
      endDate,
      status: 'Active',
      paymentStatus: 'pending'
    });

    // Mark current subscription as cancelled
    currentSubscription.status = 'Cancelled';
    currentSubscription.cancelDate = new Date();
    
    await currentSubscription.save();
    await newSubscription.save();

    res.json(newSubscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'Active'
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    subscription.status = 'Cancelled';
    subscription.cancelDate = new Date();
    await subscription.save();

    // Create new free subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const freeSubscription = new Subscription({
      userId: req.user.id,
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

    await freeSubscription.save();
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscription history
const getSubscriptionHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getActiveSubscription,
  changePlan,
  cancelSubscription,
  getSubscriptionHistory
};