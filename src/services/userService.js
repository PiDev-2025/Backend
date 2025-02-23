const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/SignUpMailVerif");
const { generateToken, authenticateToken } = require("../utils/token");

// Fonction pour générer un OTP aléatoire
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();


const tempUsers = new Map(); // Stocker temporairement les utilisateurs

const signup = async (req, res) => {
  const { name, email, password, phone, role, vehicleType } = req.body;

  try {
    // Vérification si l'utilisateur existe déjà
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Utilisateur déjà existant" });

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Générer un code OTP et sa date d'expiration
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expiration dans 10 minutes

    // Stocker temporairement l'utilisateur avec le code OTP et son expiration
    tempUsers.set(email, { name, email, password: hashedPassword, phone, role, vehicleType, otp, otpExpires });

    // Envoi du mail avec le code OTP
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

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;


  try {
    // Vérifier si l'utilisateur existe dans la mémoire temporaire
    const tempUser = tempUsers.get(email);

    if (!tempUser) {
      return res.status(400).json({ message: "OTP invalide ou utilisateur non trouvé" });
    }

    console.log("Type de l'OTP attendu :", typeof tempUser.otp);
    console.log("Type de l'OTP reçu :", typeof otp);
    console.log(`OTP attendu: ${tempUser.otp}, OTP reçu: ${otp}`);

    // Vérifier si l'OTP est correct
    if (String(tempUser.otp) !== String(otp)) {
      console.log(`OTP attendu: ${tempUser.otp}, OTP reçu: ${otp}`);
      return res.status(400).json({ message: "OTP invalide" });
    }

    // Vérifier si l'OTP est expiré
    if (new Date() > tempUser.otpExpires) {
      tempUsers.delete(email); // Supprimer de la mémoire temporaire
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

    // Supprimer l'utilisateur de la mémoire temporaire
    tempUsers.delete(email);

    // Retourner un message de succès sans générer le token
    res.status(200).json({ message: "Inscription réussie" });
  } catch (error) {
    console.error("Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

//login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.json({ token });
};


// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Ensure validation
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
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

module.exports = {
  getUsers,
  signup,
  verifyOTP,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  authenticateUser,
};
