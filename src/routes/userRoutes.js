const express = require("express");
const router = express.Router();

const {
  signup,
  loginUser,
  verifyOTP,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  authenticateUser,
} = require("../services/userService");
/*
router.post("/login-after-otp", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Utilisateur non trouvé" });
  }

  const token = generateToken(user);
  res.json({ token });
});*/

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/users/login", loginUser);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/login", loginUser);

module.exports = router;
