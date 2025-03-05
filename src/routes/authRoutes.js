const express = require("express");
const jwt = require("jsonwebtoken");
const { signup, login, verifyOTP } = require("../controllers/authController");
const router = express.Router();
const passport = require("passport");
require("dotenv").config(); // Load environment variables

// Import User Model
const User = require("../models/userModel");

// Existing Authentication Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

// Google Login Route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    if (!req.user) {
      return res.redirect("http://localhost:3000?error=Unauthorized");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        vehicleType: req.user.vehicleType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Redirect to frontend with token
    res.redirect(`http://localhost:3000/google/callback?token=${token}`);
  }
);

// 🔥 NEW: Generate Token for Face Recognition 🔥
router.post("/getToken", async (req, res) => {
  const { userId } = req.body;

  try {
    // Find user in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicleType: user.vehicleType,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Logged-In User
router.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// Logout Route
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;
