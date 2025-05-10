const SubscriptionPlan = require('../models/subscriptionPlanModel');
const Subscription = require('../models/subscriptionModel');

// Create a new subscription plan (Admin only)
const createSubscriptionPlan = async (req, res) => {
  try {
    const plan = new SubscriptionPlan(req.body);
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all subscription plans
const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a subscription plan (Admin only)
const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete/Deactivate a subscription plan (Admin only)
const deactivateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    res.status(200).json({ message: 'Plan deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get subscription analytics (Admin only)
const getSubscriptionAnalytics = async (req, res) => {
  try {
    const analytics = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          totalSubscribers: { $sum: 1 },
          activeSubscribers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'Active'] },
                    { $gt: ['$endDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          revenue: { $sum: '$price' }
        }
      }
    ]);

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  updateSubscriptionPlan,
  deactivateSubscriptionPlan,
  getSubscriptionAnalytics
};