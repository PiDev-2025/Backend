const express = require("express");
const router = express.Router();

const {
  checkEmailValidation,
  signup,
  loginAfterSignUp,
  verifyOTP,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  loginVerifyOTP,
  userProfile,
  changeUserStatus
} = require("../services/userService");


router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/loginAfterSignUp", loginAfterSignUp);
router.post("/login-verify-otp", loginVerifyOTP);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/login", loginUser);
router.post("/check-email", checkEmailValidation);
router.post("/login", loginUser);
router.get("/userProfile", userProfile);
router.put("/changeStatus/:id", changeUserStatus);
app.put("/update-profile", upload, updateProfile);

module.exports = router;
