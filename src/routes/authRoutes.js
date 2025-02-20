const express = require("express");
const { signup, login, verifyOTP } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

module.exports = router;
