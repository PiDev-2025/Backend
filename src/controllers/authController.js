const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const { generateToken } = require("../utils/token");

// Fonction pour générer un OTP aléatoire
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ➤ Inscription
exports.signup = async (req, res) => {
  const { name, email, password, phone, role, vehicleType } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ message: "Utilisateur déjà existant" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Expire en 10 min

    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      vehicleType,
      otp,
      otpExpires,
    });
    await user.save();

    // Utilisation de la fonction sendEmail pour envoyer le code OTP
    await sendEmail({
      email,
      subject: "Votre code de vérification",
      message: `Votre code OTP est : ${otp}`,
    });

    res.status(200).json({ message: "Utilisateur créé, code OTP envoyé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ➤ Connexion
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Utilisateur introuvable" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Mot de passe incorrect" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Envoi du OTP via email
    await sendEmail({
      email,
      subject: "Code de connexion",
      message: `Votre code OTP est : ${otp}`,
    });

    res.status(200).json({ message: "Code OTP envoyé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ➤ Vérification OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Requête reçue avec :", { email, otp });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("Utilisateur introuvable !");
      return res.status(400).json({ message: "Utilisateur introuvable" });
    }

    console.log("Utilisateur trouvé :", user);

    if (user.otp !== otp) {
      console.log("OTP invalide :", user.otp, "fourni :", otp);
      return res.status(400).json({ message: "OTP invalide" });
    }

    if (new Date() > user.otpExpires) {
      console.log("OTP expiré !");
      return res.status(400).json({ message: "OTP expiré" });
    }

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.status(200).json({ message: "Authentification réussie", token });
  } catch (error) {
    console.error("Erreur serveur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
