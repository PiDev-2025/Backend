const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const verifyRole = (...roles) => {
    return (req, res, next) => {
        console.log("Role de l'utilisateur:", req.user.role); // Debugging the user's role
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Accès refusé, autorisation insuffisante" });
        }
        next();
    };
};

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { verifyToken, isAdmin , verifyRole};
