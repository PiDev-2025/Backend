const express = require('express');
const router = express.Router();
const Favorite = require('../models/favoriteModel');
const { verifyToken } = require('../middlewares/authMiddleware');

// Add a favorite
router.post('/add/:parkingId', verifyToken, async (req, res) => {
  try {
    const { parkingId } = req.params;
    const userId = req.user._id;

    const favorite = new Favorite({ user: userId, parking: parkingId });
    await favorite.save();

    res.status(201).json({ success: true, favorite });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove a favorite
router.delete('/remove/:parkingId', verifyToken, async (req, res) => {
  try {
    const { parkingId } = req.params;
    const userId = req.user._id;

    await Favorite.findOneAndDelete({ user: userId, parking: parkingId });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's favorites
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const favorites = await Favorite.find({ user: userId }).populate('parking');

    res.status(200).json({ success: true, favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
