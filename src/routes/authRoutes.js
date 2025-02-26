const express = require("express");

const { signup, login, verifyOTP } = require("../controllers/authController");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
const passport = require("passport");
const user = require("../models/userModel");



// Google Login Route
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    if (!req.user) {
      return res.redirect("http://localhost:3000?error=Unauthorized");
    }

    // Generate JWT token
    // Generate JWT token and store it in a variable
    const token = jwt.sign(
      { id: req.user._id, name: req.user.name, email: req.user.email , role: req.user.role , phone: req.user.phone , vehicleType: req.user.vehicleType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );


    // Redirect to frontend with token as URL parameter
    res.redirect(`http://localhost:3000/google/callback?token=${token}`);
  }
);

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