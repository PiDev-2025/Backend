const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');
const Subscription = require('../models/subscriptionModel');
const SubscriptionPlan = require('../models/subscriptionPlanModel');
const { getActiveSubscription } = require('../services/subscriptionService');

// Admin routes for managing subscription plans
router.post('/admin/plans', verifyToken, isAdmin, async (req, res) => {
  try {
    const plan = new SubscriptionPlan(req.body);
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/admin/plans', verifyToken, isAdmin, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/admin/plans/:id', verifyToken, isAdmin, async (req, res) => {
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
});

router.delete('/admin/plans/:id', verifyToken, isAdmin, async (req, res) => {
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
});

// Public routes for viewing available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User routes for managing their own subscriptions
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId,
      status: 'Active',
      endDate: { $gt: new Date() }
    });

    if (existingSubscription) {
      return res.status(400).json({
        message: "You already have an active subscription"
      });
    }

    // Get the selected plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        message: "Selected plan not found or is no longer available"
      });
    }

    // Create subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    const subscription = new Subscription({
      userId,
      planId,
      plan: plan.plan,
      features: plan.features,
      price: plan.price,
      startDate,
      endDate,
      status: 'Active',
      paymentStatus: 'pending'
    });

    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
});

// Get user's active subscription
router.get('/my-subscription', verifyToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'Active',
      endDate: { $gt: new Date() }
    }).populate('planId');

    if (!subscription) {
      return res.status(404).json({
        message: "No active subscription found"
      });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Analytics route for admin
router.get('/admin/analytics', verifyToken, isAdmin, async (req, res) => {
  try {
    const analytics = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          totalSubscribers: { $sum: 1 },
          activeSubscribers: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'Active'] },
                  { $gt: ['$endDate', new Date()] }
                ]},
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
});

module.exports = router;
