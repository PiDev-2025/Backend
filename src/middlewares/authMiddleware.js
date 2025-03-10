const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Middleware pour vérifier le token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header("Authorization");

        console.log("Token reçu:", token); // Debugging the token received

        if (!token) return res.status(401).json({ message: "Accès refusé, token manquant" });

        const tokenWithoutBearer = token.replace("Bearer ", "").trim();
        console.log("Token après nettoyage:", tokenWithoutBearer); // Debugging the cleaned token

        const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
        console.log("Token décodé:", decoded); // Debugging the decoded token

        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) return res.status(401).json({ message: "Utilisateur non trouvé" });

        next();
    } catch (error) {
        console.error("Erreur JWT:", error.message); // Debugging the JWT error
        res.status(401).json({ message: "Token invalide", error: error.message });
    }
};

const verifyRole = (...roles) => {
    return (req, res, next) => {
        console.log("Role de l'utilisateur:", req.user.role); // Debugging the user's role
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Accès refusé, autorisation insuffisante" });
        }
        next();
    };
};

module.exports = { verifyToken, verifyRole };
