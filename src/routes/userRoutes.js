const express = require("express");
const router = express.Router();

const {
  signup,
  verifyOTP,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  loginVerifyOTP,
} = require("../services/userService");


router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login-verify-otp", loginVerifyOTP);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/login", loginUser);

module.exports = router;
