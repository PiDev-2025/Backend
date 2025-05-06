const jwt = require("jsonwebtoken");

exports.generateToken = (user) => {
  return jwt.sign({  id: user._id, name: user.name, email: user.email, role: user.role  }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.authenticateToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
