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
      return res.status(400).json({ error: "User already exists" });

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
      subject: "Your verification code",
      message: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ message: "User created, OTP code sent" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ➤ Connexion
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been blocked. Please contact support." });
    }

    if (!user.isVerified && user.role !== "admin") {
      return res.status(403).json({ error: "Please verify your email address before logging in" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Envoi du OTP via email
    await sendEmail({
      email,
      subject: "Login code",
      message: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ message: "OTP code sent" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ➤ Vérification OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Request received with:", { email, otp });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found!");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User found:", user);

    if (user.otp !== otp) {
      console.log("Invalid OTP:", user.otp, "provided:", otp);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (new Date() > user.otpExpires) {
      console.log("OTP expired!");
      return res.status(400).json({ error: "OTP code has expired" });
    }

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = generateToken(user);
    res.status(200).json({ message: "Authentication successful", token });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
