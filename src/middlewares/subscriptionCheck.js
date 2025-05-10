const { getActiveSubscription } = require('../services/subscriptionService');
const { jwtDecode } = require('jwt-decode');
const Reservation = require('../models/reservationModel');

const checkSubscriptionAccess = async (req, res, next) => {
  try {
    // Skip check for non-reservation routes
    if (!req.path.includes('/reservations')) {
      return next();
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required. Please log in.' 
      });
    }

    try {
      const decoded = jwtDecode(token);
      const userId = decoded.id;

      // Skip subscription check for owners and admins
      if (decoded.role === 'Owner' || decoded.role === 'Admin') {
        return next();
      }

      // Get active subscription
      const subscription = await getActiveSubscription(userId);
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found. Please subscribe to make reservations.',
          requiredAction: 'subscribe'
        });
      }

      // For reservation creation, check specific limits
      if (req.method === 'POST' && req.path.includes('/reservations')) {
        const { startTime, endTime } = req.body;
        
        if (!startTime || !endTime) {
          return res.status(400).json({
            success: false,
            message: 'Start time and end time are required for reservations'
          });
        }

        const duration = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
        
        // Check reservation duration
        if (duration > subscription.features.maxReservationHours) {
          return res.status(403).json({
            success: false,
            message: `Your ${subscription.plan} plan only allows reservations up to ${subscription.features.maxReservationHours} hours`,
            currentPlan: subscription.plan,
            maxHours: subscription.features.maxReservationHours,
            suggestedAction: 'upgrade'
          });
        }

        // Check number of active reservations
        const activeReservations = await Reservation.countDocuments({
          userId,
          status: { $in: ['pending', 'accepted'] },
          endTime: { $gt: new Date() }
        });

        if (activeReservations >= subscription.features.maxActiveReservations) {
          return res.status(403).json({
            success: false,
            message: `Your ${subscription.plan} plan only allows ${subscription.features.maxActiveReservations} active reservations`,
            currentPlan: subscription.plan,
            maxReservations: subscription.features.maxActiveReservations,
            currentActiveReservations: activeReservations,
            suggestedAction: 'upgrade'
          });
        }
      }

      // Add subscription info to request for use in later middleware or routes
      req.subscription = subscription;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking subscription access',
      error: error.message
    });
  }
};

module.exports = { checkSubscriptionAccess };