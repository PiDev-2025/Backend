const express = require("express");
const passport = require("passport");

const router = express.Router();

// Google Login Route
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("http://localhost:3000"); // Redirect to frontend after login
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
