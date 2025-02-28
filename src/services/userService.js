const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/SignUpMailVerif");
const { authenticateToken, generateToken } = require("../utils/token");

// Function to generate a random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Temporary storage for OTP validation
const tempUsers = new Map(); // For signup OTP verification
const tempUserslogin = new Map(); // For login OTP verification

// **Signup - Send OTP**
const signup = async (req, res) => {
  const { name, email, password, phone, role, vehicleType } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Utilisateur déjà existant" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Store user temporarily with OTP
    tempUsers.set(email, { name, email, password: hashedPassword, phone, role, vehicleType, otp, otpExpires });

    // Send OTP via email
    await sendEmail({
      email,
      subject: "Your Verification Code",
      otp: otp,
    });

    res.status(200).json({ message: "Code OTP envoyé. Veuillez le valider pour finaliser l'inscription." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

//get User by id from token
const getUserByIdFromToken = async (token) => {
  try {
    if (!token) {
      throw new Error("Token is missing");
    }

    // Décoder le token
    const decoded = authenticateToken(token);

    // Rechercher l'utilisateur par ID
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    console.error("Invalid token or user not found", error);
    return null;
  }
};

//get user Information from Token
const userProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Récupérer le token Bearer
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const user = await getUserByIdFromToken(token);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in userProfile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// **Verify Signup OTP**
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const tempUser = tempUsers.get(email);

    if (!tempUser) return res.status(400).json({ message: "OTP invalide ou utilisateur non trouvé" });

    if (String(tempUser.otp) !== String(otp)) {
      return res.status(400).json({ message: "OTP invalide" });
    }

    if (new Date() > tempUser.otpExpires) {
      tempUsers.delete(email);
      return res.status(400).json({ message: "OTP expiré" });
    }

    // Créer et sauvegarder l'utilisateur en base de données

    const newUser = new User({
      name: tempUser.name,
      email: tempUser.email,
      password: tempUser.password,
      phone: tempUser.phone,
      role: tempUser.role,
      vehicleType: tempUser.vehicleType,
    });

    await newUser.save();

    tempUsers.delete(email);

    res.status(200).json({ message: "Inscription réussie" });
  } catch (error) {
    console.error("Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// **Login - Send OTP**
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    tempUserslogin.set(email, { otp, otpExpires });

    // Send OTP via email
    await sendEmail({
      email,
      subject: "Your Verification Code",
      otp: otp,
    });

    res.status(200).json({ message: "Code OTP envoyé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// **Verify Login OTP**
const loginVerifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const tempUser = tempUserslogin.get(email);
    if (!tempUser) {
      return res.status(400).json({ message: "OTP invalide ou utilisateur non trouvé" });
    }

    if (String(tempUser.otp) !== String(otp)) {
      return res.status(400).json({ message: "OTP invalide" });
    }

    if (new Date() > tempUser.otpExpires) {
      tempUserslogin.delete(email);
      return res.status(400).json({ message: "OTP expiré" });
    }

    // Find user in database
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable" });

    // Generate JWT token
    const token = generateToken();

    tempUserslogin.delete(email);

    res.status(200).json({ message: "Authentification réussie", token });
  } catch (error) {
    console.error("Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// **Get All Users**
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Get User By ID**
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Update User**
const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// **Delete User**
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(403).json({ message: "Access Denied" });

  try {
    req.user = authenticateToken(token);
    next();
  } catch {
    res.status(403).json({ message: "Invalid Token" });
  }
};

// Vérification de l'email (existe déjà ou non)
const checkEmailValidation = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userExists = await User.findOne({ email });
    res.json({ exists: !!userExists });
  } catch (error) {
    console.error("Error checking email:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//login after password KENZAAAA3333
const loginAfterSignUp = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.json({ token });
};

//toggle user status
const toggleUserStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Inverser le statut
    user.status = user.status === "Active" ? "Blocked" : "Active";
    await user.save();

    return user;
  } catch (error) {
    console.error("Error toggling user status:", error);
    throw error;
  }
};

//change status user
const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const updatedUser = await toggleUserStatus(userId);
    res.status(200).json({ message: "User status updated", user: updatedUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//update user profile with upload photo
const updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Vérifier s'il y a une image uploadée
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    // Mettre à jour l'image de l'utilisateur avec l'URL Cloudinary
    user.image = req.file.path; // req.file.path contient l'URL Cloudinary de l'image uploadée
    Object.assign(user, req.body);
    await user.save();
    res.status(200).json({ message: "Profile updated successfully", user }); 
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};




module.exports = {
  checkEmailValidation,
  loginUser,
  getUsers,
  signup,
  verifyOTP,
  loginAfterSignUp,
  getUserById,
  updateUser,
  deleteUser,
  authenticateUser,
  loginVerifyOTP,
  userProfile,
  changeUserStatus,updateProfile
};
