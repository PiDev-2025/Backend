const express = require("express");
const router = express.Router();
const { upload, getUserFromToken } = require("../middlewares/uploadMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");
const User = require("../models/userModel");

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
  changeUserStatus,
  updateProfile,
  createUser, // Import the createUser function
  addFavorite,
  removeFavorite
} = require("../services/userService");

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/loginAfterSignUp", loginAfterSignUp);
router.post("/login-verify-otp", loginVerifyOTP);
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.post("/users", createUser); // Add this route to create a user
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/login", loginUser);
router.post("/check-email", checkEmailValidation);
router.post("/login", loginUser);
router.get("/userProfile", userProfile);
router.put("/changeStatus/:id", changeUserStatus);
router.put("/profile", getUserFromToken, upload, updateProfile);

router.post("/favorites/add/:parkingId", verifyToken, addFavorite);
router.delete("/favorites/remove/:parkingId", verifyToken, removeFavorite);
router.get("/employees", verifyToken, async (req, res) => {
  try {
    // 🔍 Vérifier si des employés existent en base de données
    const employees = await User.find({ role: "Employe" }).select("name phone role");

    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "Aucun employé trouvé" });
    }

    res.status(200).json(employees);
  } catch (error) {
    console.error("Erreur lors de la récupération des employés :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});


module.exports = router;
